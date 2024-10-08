import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";
import dotenv from "dotenv";
import { setInterval } from "timers";
import axios, { AxiosError } from "axios";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET!;
const supabase = createClient(supabaseUrl, supabaseKey);

const provider = new ethers.JsonRpcProvider(
  "https://rpc-evm-sidechain.xrpl.org/",
);

const explorerApiUrl = "https://explorer.xrplevm.org/api";

async function retryAxios(fn: () => Promise<any>, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (
      retries > 0 &&
      axios.isAxiosError(error) &&
      error.response?.status === 429
    ) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryAxios(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

async function getContractInfo(address: string) {
  return retryAxios(async () => {
    const response = await axios.get(
      `${explorerApiUrl}/v2/addresses/${address}`,
      {
        params: {
          module: "address",
          action: "info",
        },
      },
    );
    const data = response.data;
    return {
      isContract: data.is_contract,
      isVerified: data.is_verified,
      contractName: data.name,
    };
  });
}

async function decodeLog(log: ethers.Log) {
  try {
    const response = await axios.get(
      `${explorerApiUrl}/v2/transactions/${log.transactionHash}/logs`,
      {
        params: {
          module: "transaction",
          action: "logs",
        },
      },
    );
    const logs = response.data.items;
    const decodedLog = logs.find((l: any) => l.index === log.index);
    if (!decodedLog) {
      throw new Error(
        `Log not found for tx ${log.transactionHash}, index ${log.index}`,
      );
    }
    return {
      method_call: decodedLog.decoded.method_call,
      method_id: decodedLog.decoded.method_id,
      parameters: decodedLog.decoded.parameters.map((param: any) => ({
        name: param.name,
        type: param.type,
        value: param.value,
        indexed: param.indexed,
      })),
    };
  } catch (error) {
    console.error(
      `Error decoding log for tx ${log.transactionHash}, index ${log.index}:`,
      error,
    );
    return null;
  }
}

async function processDecodedLog(
  log: ethers.Log,
  receipt: ethers.TransactionReceipt,
) {
  try {
    const contractInfo = await getContractInfo(log.address);
    const decodedLogInfo = await decodeLog(log);

    if (contractInfo && decodedLogInfo) {
      await supabase.from("decoded_logs").insert({
        log_id: log.index,
        tx_hash: log.transactionHash,
        block_number: log.blockNumber,
        address: log.address,
        is_contract: contractInfo.isContract,
        is_verified: contractInfo.isVerified,
        contract_name: contractInfo.contractName,
        decoded_input: decodedLogInfo.parameters,
        method_id: decodedLogInfo.method_id,
        call_signature: decodedLogInfo.method_call,

        is_successful: receipt.status === 1,
      });
    } else {
      console.warn(
        `Skipping log processing for tx ${log.transactionHash}, index ${log.index} due to missing data`,
      );
    }
  } catch (error) {
    console.error(
      `Error processing decoded log for tx ${log.transactionHash}, index ${log.index}:`,
      error,
    );
  }
}

async function processBlock(blockNumber: number) {
  try {
    const block = await provider.getBlock(blockNumber, true);
    if (!block) throw new Error(`Block ${blockNumber} not found`);

    // Insert block data
    await supabase.from("blocks").insert({
      block_number: block.number,
      block_hash: block.hash,
      block_timestamp: new Date(block.timestamp * 1000).toISOString(),
      difficulty: block.difficulty?.toString(),
      gas_limit: block.gasLimit.toString(),
      gas_used: block.gasUsed.toString(),
      base_fee_per_gas: block.baseFeePerGas?.toString(),
      parent_hash: block.parentHash,
      miner_address: block.miner,
      nonce: block.nonce,
      size: JSON.stringify(block).length,
    });

    // Process transactions
    for (const tx of block.transactions) {
      const fullTx = await provider.getTransaction(tx);
      if (!fullTx) continue;

      await supabase.from("transactions").insert({
        tx_hash: fullTx.hash,
        block_number: fullTx.blockNumber,
        from_address: fullTx.from,
        to_address: fullTx.to,
        value: fullTx.value.toString(),
        gas: fullTx.gasLimit.toString(),
        gas_price: fullTx.gasPrice?.toString(),
        input: fullTx.data,
        nonce: fullTx.nonce,
        transaction_index: fullTx.index,
        transaction_type: fullTx.type,
        max_fee_per_gas: fullTx.maxFeePerGas?.toString(),
        max_priority_fee_per_gas: fullTx.maxPriorityFeePerGas?.toString(),
      });

      // Process logs
      const receipt = await provider.getTransactionReceipt(tx);
      if (receipt) {
        for (const log of receipt.logs) {
          await supabase.from("logs").insert({
            log_index: log.index,
            tx_hash: log.transactionHash,
            block_number: log.blockNumber,
            address: log.address,
            data: log.data,
            topic0: log.topics[0],
            topic1: log.topics[1],
            topic2: log.topics[2],
            topic3: log.topics[3],
          });

          // Process decoded logs
          await processDecodedLog(log, receipt);
        }
      }
    }

    console.log(
      `Processed block ${blockNumber} with ${block.transactions.length} transactions`,
    );
  } catch (error) {
    console.error(`Error processing block ${blockNumber}:`, error);
  }
}

async function watchNewBlocks() {
  let latestBlockNumber = await provider.getBlockNumber();

  setInterval(async () => {
    const currentBlockNumber = await provider.getBlockNumber();
    if (currentBlockNumber > latestBlockNumber) {
      for (
        let blockNum = latestBlockNumber + 1;
        blockNum <= currentBlockNumber;
        blockNum++
      ) {
        await processBlock(blockNum);
      }
      latestBlockNumber = currentBlockNumber;
    }
  }, 10000);
}

async function processAllPreviousBlocks() {
  let latestBlockNumber = await provider.getBlockNumber();

  const oldestBlockNumber = 0;

  for (
    let blockNum = latestBlockNumber;
    blockNum >= oldestBlockNumber;
    blockNum--
  ) {
    await processBlock(blockNum);
  }
}

watchNewBlocks();
processAllPreviousBlocks();

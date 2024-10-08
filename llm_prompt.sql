-- calculate the transaction volume by named/unnamed contract per hour for the past 24 hours

WITH
  contract_transactions AS (
    SELECT
      t.block_number,
      t.value,
      dl.contract_name,
      DATE_TRUNC('hour', b.block_timestamp AT TIME ZONE 'UTC') AS HOUR
    FROM
      public.transactions t
      JOIN public.blocks b ON t.block_number = b.block_number
      LEFT JOIN public.decoded_logs dl ON t.tx_hash = dl.tx_hash
    WHERE
      b.block_timestamp >= NOW() - INTERVAL '24 hours'
  )
SELECT
  HOUR,
  COALESCE(contract_name, 'Unnamed') AS contract_type,
  SUM(VALUE) AS total_volume
FROM
  contract_transactions
GROUP BY
  HOUR,
  contract_type
ORDER BY
  HOUR,
  contract_type;
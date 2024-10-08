"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Textarea } from "@/components/ui/textarea";
import React, { useEffect, useState } from "react";
import ReactJson from "react-json-view";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedChart, setSelectedChart] = useState("pie");

  const directQuery = async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data = await executeQuery(query);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    setResponse(data);
    setLoading(false);
  };

  const executeQuery = async (query: string) => {
    const res = await fetch("/api/executeQuery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await res.json();
  };

  const PieChartComponent = () => {
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
      const fetchData = async () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const data = await executeQuery(`
          SELECT
            contract_name,
            COUNT(*) AS contract_count
          FROM
            public.decoded_logs
          GROUP BY
            contract_name
          ORDER BY
            contract_count DESC;
        `);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        setChartData(data);
      };

      void fetchData();
    }, []);

    const chartConfig = {
      desktop: {
        label: "Desktop",
        color: "#008cff",
      },
    } satisfies ChartConfig;

    return (
      <Card>
        <CardHeader className="items-center">
          <CardTitle>Calls by Verified Contracts</CardTitle>
          <CardDescription>24h</CardDescription>
        </CardHeader>
        <CardContent className="pb-0">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <RadarChart data={chartData}>
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <PolarAngleAxis dataKey="contract_name" />
              <PolarGrid />
              <Radar
                dataKey="contract_count"
                fill="#008cff"
                fillOpacity={0.8}
                dot={{
                  r: 4,
                  fillOpacity: 1,
                }}
              />
            </RadarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  };

  const LineChartComponent = () => {
    const [lineChartData, setLineChartData] = useState([]);

    useEffect(() => {
      const fetchData = async () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const data = await executeQuery(`
          SELECT
            DATE_TRUNC('hour', b.block_timestamp) AS transaction_hour,
            SUM(t.value) AS total_transaction_volume
          FROM
            public.blocks b
            JOIN public.transactions t ON b.block_number = t.block_number
          WHERE
            b.block_timestamp >= NOW() - INTERVAL '1 month'
          GROUP BY
            transaction_hour
          ORDER BY
            transaction_hour;
        `);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        setLineChartData(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
          data.map((item: any) => ({
            ...item,
            total_transaction_volume:
              parseFloat(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
                item.total_transaction_volume,
              ) /
              10 ** 18,
          })),
        );
      };

      void fetchData();
    }, []);

    const chartConfig = {
      desktop: {
        label: "Transaction Volume",
        color: "#008cff",
      },
    } satisfies ChartConfig;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Total Transaction Volume per Hour</CardTitle>
          <CardDescription>Last Month</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <LineChart
              data={lineChartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="transaction_hour"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value: string | number | Date) =>
                  new Date(value).toLocaleString()
                }
              />
              <YAxis
                domain={["dataMin", "dataMax"]}
                label={{ value: "XRP", angle: -90, position: "insideLeft" }}
              />
              <ChartTooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    const { transaction_hour, total_transaction_volume } =
                      payload[0]?.payload;
                    return (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="tooltip">
                            <p>{`Time: ${new Date(transaction_hour as string).toLocaleString()}`}</p>
                            <p>{`Volume: ${total_transaction_volume} XRP`}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                  return null;
                }}
              />
              <Line
                dataKey="total_transaction_volume"
                type="monotone"
                stroke="#008cff"
                strokeWidth={2}
                dot={{
                  fill: "#008cff",
                }}
                activeDot={{
                  r: 6,
                }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#15162c] text-white">
      <div className="container flex flex-col items-start justify-center gap-12 px-4 py-16">
        <div className="flex items-center">
          <svg
            width="94"
            height="24"
            viewBox="0 0 94 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_2251_11855)">
              <path
                d="M17.5078 14.6486C16.7516 14.2103 15.8986 14.0839 15.0535 14.0563C14.3447 14.0326 13.2883 13.5784 13.2883 12.2792C13.2924 11.8112 13.4793 11.3634 13.8091 11.0313C14.1389 10.6993 14.5855 10.5094 15.0535 10.5022C15.8986 10.4726 16.7516 10.3462 17.5078 9.90983C18.1868 9.51664 18.7504 8.95173 19.1421 8.27182C19.5337 7.5919 19.7396 6.82092 19.739 6.03628C19.7384 5.25164 19.5314 4.48096 19.1387 3.80163C18.7461 3.1223 18.1816 2.55823 17.502 2.16606C16.8224 1.77389 16.0516 1.56742 15.267 1.56738C14.4823 1.56735 13.7115 1.77375 13.0318 2.16586C12.3522 2.55797 11.7877 3.12198 11.395 3.80128C11.0023 4.48057 10.7952 5.25123 10.7945 6.03587C10.7945 6.90267 11.1025 7.70037 11.4974 8.4408C11.8272 9.06277 11.995 10.2179 10.8597 10.8714C10.4493 11.0997 9.96585 11.1582 9.51293 11.0341C9.06001 10.9101 8.67373 10.6135 8.43697 10.208C7.99271 9.49716 7.44972 8.82583 6.70534 8.39737C6.02545 8.00519 5.25432 7.79886 4.46943 7.79909C3.68454 7.79933 2.91353 8.00613 2.23388 8.39871C1.55422 8.79129 0.989854 9.35582 0.597477 10.0356C0.205101 10.7154 -0.00146484 11.4864 -0.00146484 12.2713C-0.00146484 13.0562 0.205101 13.8273 0.597477 14.5071C0.989854 15.1868 1.55422 15.7514 2.23388 16.1439C2.91353 16.5365 3.68454 16.7433 4.46943 16.7436C5.25432 16.7438 6.02545 16.5375 6.70534 16.1453C7.45565 15.7109 7.99271 15.0455 8.43697 14.3347C8.80225 13.7423 9.71249 13.0078 10.8597 13.6712C11.2626 13.9126 11.5549 14.3023 11.6738 14.7568C11.7926 15.2112 11.7286 15.6941 11.4955 16.1018C11.1006 16.8423 10.7945 17.64 10.7945 18.5068C10.7946 19.2921 11.0013 20.0635 11.3939 20.7436C11.7866 21.4236 12.3513 21.9884 13.0313 22.3811C13.7114 22.7738 14.4828 22.9806 15.2681 22.9807C16.0534 22.9808 16.8248 22.7742 17.505 22.3817C18.1851 21.9892 18.75 21.4247 19.1429 20.7447C19.5357 20.0647 19.7426 19.2934 19.7429 18.5081C19.7432 17.7228 19.5368 16.9513 19.1445 16.2711C18.7521 15.5908 18.1877 15.0258 17.5078 14.6328V14.6486Z"
                fill="#008CFF"
              ></path>
              <path
                d="M25.8975 5.4932H29.0112V6.96222C29.4264 6.45703 29.9481 6.04978 30.5389 5.76955C31.1298 5.48933 31.7752 5.34305 32.4291 5.34116C32.8726 5.32455 33.3161 5.37582 33.7441 5.4932V9.04729C33.7441 9.04729 33.3137 8.89525 32.2771 8.89525C30.5 8.89525 29.3153 10.08 29.3153 11.857V19.1133H25.8975V5.4932ZM42.6313 5.4932H45.7451V6.81019C46.8082 5.87159 48.1753 5.34974 49.5934 5.34116C53.0112 5.34116 55.973 8.30291 55.973 12.3032C55.973 16.3036 53.0112 19.2653 49.5934 19.2653C48.2875 19.2686 47.0259 18.7914 46.0492 17.9246V24.0001H42.6313V5.4932ZM52.5551 12.3032C52.5551 10.076 51.0861 8.60698 49.1629 8.60698C47.2398 8.60698 45.7451 10.0701 45.7451 12.3032C45.7451 14.5364 47.2378 15.9936 49.1649 15.9936C51.092 15.9936 52.5551 14.5324 52.5551 12.3032ZM58.4786 5.4932H61.5924V6.81019C62.6558 5.87206 64.0227 5.35028 65.4407 5.34116C68.8585 5.34116 71.8203 8.30291 71.8203 12.3032C71.8203 16.3036 68.8585 19.2653 65.4407 19.2653C64.135 19.2675 62.8738 18.7905 61.8965 17.9246V24.0001H58.4786V5.4932ZM68.4044 12.3032C68.4044 10.076 66.9354 8.60698 65.0103 8.60698C63.0851 8.60698 61.5924 10.0701 61.5924 12.3032C61.5924 14.5364 63.0871 15.9936 65.0103 15.9936C66.9334 15.9936 68.4044 14.5324 68.4044 12.3032ZM74.3279 0.456258H77.7458V19.1133H74.3279V0.456258ZM80.2514 12.3032C80.2514 8.45692 83.3652 5.34116 87.0614 5.34116C90.6293 5.34116 93.5911 8.15284 93.5911 12.3032C93.5768 12.7542 93.5259 13.2032 93.439 13.6459H83.9476C84.2517 14.9629 85.2982 15.9936 87.0614 15.9936C88.6568 15.9936 89.2906 15.261 89.2906 15.261H92.9869C92.3017 17.0381 90.1752 19.2594 87.0634 19.2594C83.3652 19.2653 80.2514 16.1515 80.2514 12.3032ZM90.3213 11.2666C90.1659 10.5153 89.7563 9.84055 89.1614 9.35608C88.5665 8.87162 87.8227 8.6071 87.0555 8.6071C86.2883 8.6071 85.5445 8.87162 84.9496 9.35608C84.3547 9.84055 83.9451 10.5153 83.7897 11.2666H90.3213ZM35.7383 1.92331C35.7383 1.40959 35.9424 0.916911 36.3057 0.553657C36.6689 0.190402 37.1616 -0.0136719 37.6753 -0.0136719C38.189 -0.0136719 38.6817 0.190402 39.045 0.553657C39.4082 0.916911 39.6123 1.40959 39.6123 1.92331C39.6123 2.43703 39.4082 2.92971 39.045 3.29296C38.6817 3.65621 38.189 3.86029 37.6753 3.86029C37.1616 3.86029 36.6689 3.65621 36.3057 3.29296C35.9424 2.92971 35.7383 2.43703 35.7383 1.92331ZM35.9674 5.4932H39.3912V19.1172H35.9733L35.9674 5.4932Z"
                fill="#FAFAFA"
              ></path>
            </g>
            <defs>
              <clipPath id="clip0_2251_11855">
                <rect width="93.5931" height="24" fill="white"></rect>
              </clipPath>
            </defs>
          </svg>
          <h2 className="ml-2 text-xl font-bold text-white">
            EVM Chain Analytics
          </h2>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-white">
          Proof of Concept Data Operations
        </h1>
        <div className="grid h-full w-full grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
          <Card className="h-full w-full">
            <CardHeader>
              <CardTitle>Analytics Visualization</CardTitle>
              <CardDescription>Select a chart to render</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                onValueChange={(value) => setSelectedChart(value)}
                defaultValue="pie"
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Chart" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pie">Verified Contract Calls</SelectItem>
                  <SelectItem value="line">Total Transaction Volume</SelectItem>
                </SelectContent>
              </Select>
              <br />
              {selectedChart === "pie" && <PieChartComponent />}
              {selectedChart === "line" && <LineChartComponent />}
            </CardContent>
          </Card>

          {/* Card for SQL Code Input */}
          <Card className="h-full w-full">
            <CardHeader>
              <CardTitle>Direct SQL Query</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="eg. SELECT * FROM transactions"
                rows={5}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <br />
              <Button onClick={directQuery} disabled={loading}>
                {loading ? (
                  <>
                    Execute Query
                    <svg
                      className="ml-5 h-5 w-5 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </>
                ) : (
                  <span>Execute Query</span>
                )}
              </Button>
              <br />
              <br />
              {response && (
                <div className="max-h-[300px] w-full overflow-auto">
                  <ReactJson
                    src={response}
                    collapsed={2}
                    theme="bright:inverted"
                    iconStyle="square"
                    enableClipboard={false}
                    name={false}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="h-full w-full">
            <CardHeader>
              <CardTitle>Natural Language Query</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea placeholder="Ask a question about your data..." />
            </CardContent>
          </Card>

          <Card className="h-full w-full">
            <CardHeader>
              <CardTitle>Custom Dashboards</CardTitle>
            </CardHeader>
            <CardContent>
              <Button>View Dashboards →</Button>
              <br />
              <br />
              <Button>Create Dashboard +</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

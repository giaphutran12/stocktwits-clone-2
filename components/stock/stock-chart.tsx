"use client";

// Stock Chart Component
// This is a "client component" (note the "use client" at top) because it:
// 1. Uses React hooks (useState, useEffect)
// 2. Has interactive elements (buttons)
// 3. Fetches data on the client side
//
// In Next.js, components are "server components" by default. We add "use client"
// when we need browser-specific features like state or event handlers.

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

type TimeRange = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "5y";

interface ChartDataPoint {
  date: string;
  close: number;
}

interface StockChartProps {
  symbol: string;
}

const timeRanges: { label: string; value: TimeRange }[] = [
  { label: "1D", value: "1d" },
  { label: "5D", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "5Y", value: "5y" },
];

export function StockChart({ symbol }: StockChartProps) {
  // State = data that can change over time. When state changes, React re-renders.
  const [range, setRange] = useState<TimeRange>("1mo");
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // useEffect runs code when the component mounts or when dependencies change.
  // Here it runs whenever `symbol` or `range` changes.
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/stocks/${symbol}/history?range=${range}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch chart data");
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [symbol, range]);

  // Calculate if stock is up or down (for color)
  const isPositive =
    data.length > 1 ? data[data.length - 1].close >= data[0].close : true;
  const chartColor = isPositive ? "#22c55e" : "#ef4444"; // green or red

  // Format date for X-axis based on range
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (range === "1d" || range === "5d") {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="w-full">
      {/* Time range buttons */}
      <div className="flex gap-1 mb-4">
        {timeRanges.map((tr) => (
          <button
            key={tr.value}
            onClick={() => setRange(tr.value)}
            className={cn(
              "px-3 py-1 text-sm rounded-md transition-colors",
              range === tr.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            )}
          >
            {tr.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div className="h-[300px] w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            Loading chart...
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-red-500">
            {error}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
                labelFormatter={(label) => new Date(label).toLocaleString()}
              />
              <Line
                type="monotone"
                dataKey="close"
                stroke={chartColor}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

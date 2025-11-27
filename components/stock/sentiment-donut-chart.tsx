"use client";

// Sentiment Donut Chart Component
// Displays sentiment distribution (Bullish/Bearish/Neutral) as a donut chart
// Uses recharts PieChart with innerRadius to create the donut hole effect

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface SentimentDonutChartProps {
  data: {
    bullish: { count: number; percentage: number };
    bearish: { count: number; percentage: number };
    neutral: { count: number; percentage: number };
  };
  total: number;
}

// Sentiment colors matching the app theme
const COLORS = {
  bullish: "#22c55e", // green
  bearish: "#ef4444", // red
  neutral: "#6b7280", // gray
};

export function SentimentDonutChart({
  data,
  total,
}: SentimentDonutChartProps) {
  // Transform data into recharts format
  // recharts expects an array of objects with name and value properties
  const chartData = [
    {
      name: "Bullish",
      value: data.bullish.count,
      percentage: data.bullish.percentage,
      color: COLORS.bullish,
    },
    {
      name: "Bearish",
      value: data.bearish.count,
      percentage: data.bearish.percentage,
      color: COLORS.bearish,
    },
    {
      name: "Neutral",
      value: data.neutral.count,
      percentage: data.neutral.percentage,
      color: COLORS.neutral,
    },
  ].filter((item) => item.value > 0); // Only show sentiments with posts

  // Handle empty state (no posts)
  if (total === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No posts yet</p>
          <p className="text-sm">Be the first to share your sentiment!</p>
        </div>
      </div>
    );
  }

  // Custom label renderer for center text
  const renderCenterLabel = () => {
    return (
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-gray-900"
      >
        <tspan x="50%" dy="-0.5em" className="text-3xl font-bold">
          {total}
        </tspan>
        <tspan x="50%" dy="1.5em" className="text-sm fill-gray-500">
          {total === 1 ? "Post" : "Posts"}
        </tspan>
      </text>
    );
  };

  // Custom legend formatter to show percentage and count
  const renderLegend = (props: any) => {
    const { payload } = props;

    return (
      <div className="flex justify-center gap-6 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">
              {entry.value}:{" "}
              <span className="font-semibold">
                {entry.payload.percentage}%
              </span>{" "}
              <span className="text-gray-500">({entry.payload.value})</span>
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60} // This creates the donut hole
              outerRadius={80}
              paddingAngle={2} // Small gap between slices
              dataKey="value"
              label={false} // We'll show the center label instead
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                `${value} posts (${props.payload.percentage}%)`,
                name,
              ]}
            />
            <Legend content={renderLegend} />
            {renderCenterLabel()}
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

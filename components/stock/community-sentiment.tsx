"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SentimentDonutChart } from "@/components/stock/sentiment-donut-chart";

type Period = "24h" | "7d" | "30d";

type SentimentData = {
  symbol: string;
  period: string;
  total: number;
  breakdown: {
    bullish: { count: number; percentage: number };
    bearish: { count: number; percentage: number };
    neutral: { count: number; percentage: number };
  };
  aiSummary: {
    summary: string | null;
    keyThemes: string[];
    sentimentStrength: "strong" | "moderate" | "weak" | "mixed" | null;
    confidence: "high" | "medium" | "low" | null;
  } | null;
  qualityPostCount: number;
  updatedAt: string;
};

interface CommunitySentimentProps {
  symbol: string;
}

const periods: { label: string; value: Period }[] = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
];

/**
 * Returns styling for sentiment strength badge
 */
function getSentimentStrengthConfig(strength: string | null) {
  if (!strength) return null;

  const configs: Record<string, { label: string; className: string }> = {
    strong: {
      label: "Strong Signal",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    moderate: {
      label: "Moderate Signal",
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    weak: {
      label: "Weak Signal",
      className: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    },
    mixed: {
      label: "Mixed Signal",
      className: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    },
  };

  return configs[strength.toLowerCase()] || null;
}

export function CommunitySentiment({ symbol }: CommunitySentimentProps) {
  const [period, setPeriod] = useState<Period>("24h");
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/stocks/${symbol}/sentiment?period=${period}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch sentiment data");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [symbol, period]);

  const sentimentStrengthConfig = data?.aiSummary?.sentimentStrength
    ? getSentimentStrengthConfig(data.aiSummary.sentimentStrength)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Community Sentiment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Time period toggle buttons */}
        <div className="flex gap-1">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "px-3 py-1 text-sm rounded-md transition-colors",
                period === p.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        {loading ? (
          <div className="h-[200px] flex items-center justify-center text-gray-500">
            Loading sentiment data...
          </div>
        ) : error ? (
          <div className="h-[200px] flex items-center justify-center text-red-500">
            {error}
          </div>
        ) : !data || data.total === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-gray-500">
            No posts available for this period
          </div>
        ) : (
          <>
            {/* Sentiment Donut Chart */}
            <SentimentDonutChart
              data={data.breakdown}
              total={data.total}
            />

            {/* AI Insights Section */}
            {data.aiSummary && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border/50">
                {/* AI Header */}
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-violet-500" />
                  <span className="text-sm font-medium text-muted-foreground">
                    AI Insights
                  </span>
                </div>

                {/* Summary */}
                {data.aiSummary.summary && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {data.aiSummary.summary}
                  </p>
                )}

                {/* Key Themes */}
                {data.aiSummary.keyThemes.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Key Themes:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {data.aiSummary.keyThemes.map((theme, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20"
                        >
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sentiment Strength Badge */}
                {sentimentStrengthConfig && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-xs", sentimentStrengthConfig.className)}
                    >
                      {sentimentStrengthConfig.label}
                    </Badge>
                    {data.aiSummary.confidence && (
                      <span className="text-xs text-muted-foreground">
                        ({data.aiSummary.confidence} confidence)
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
              Based on {data.qualityPostCount} quality post
              {data.qualityPostCount !== 1 ? "s" : ""}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

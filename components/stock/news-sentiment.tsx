"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  ExternalLink,
  Newspaper,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface NewsSentimentProps {
  symbol: string;
}

interface NewsArticle {
  id: string;
  headline: string;
  source: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL" | "MIXED" | null;
}

interface NewsSentimentData {
  symbol: string;
  available: boolean;
  message?: string;
  isStale?: boolean; // True when using cached data because not enough fresh articles
  staleReason?: string; // Explanation of why data is stale
  breakdown?: {
    bullish: { percentage: number };
    bearish: { percentage: number };
    neutral: { percentage: number };
  };
  companyNewsScore?: number;
  articleCount?: number;
  aiAnalysis?: {
    summary: string | null;
    keyThemes: string[] | null;
    sentimentStrength: "strong" | "moderate" | "weak" | "mixed" | null;
    confidence: "high" | "medium" | "low" | null;
  };
  recentArticles?: NewsArticle[];
  lastUpdated?: string;
}

// ============================================
// COMPONENT
// ============================================

export function NewsSentiment({ symbol }: NewsSentimentProps) {
  const [data, setData] = useState<NewsSentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data function
  const fetchData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const url = `/api/stocks/${symbol}/news-sentiment${forceRefresh ? "?refresh=true" : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error("[NewsSentiment] Fetch error:", err);
      setError("Failed to load news sentiment");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch on mount and when symbol changes
  useEffect(() => {
    fetchData();
  }, [symbol]);

  // ============================================
  // RENDER STATES
  // ============================================

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            News Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => fetchData()}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No data available
  if (!data?.available) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            News Sentiment
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            title="Refresh news sentiment"
          >
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
            />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {data?.message || `No news sentiment data available for ${symbol}.`}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  const { breakdown, aiAnalysis, recentArticles, articleCount, lastUpdated } = data;

  // Determine overall sentiment for styling
  const getOverallSentiment = (): "bullish" | "bearish" | "neutral" | "mixed" => {
    if (!breakdown) return "neutral";
    const { bullish, bearish } = breakdown;
    if (bullish.percentage >= 60) return "bullish";
    if (bearish.percentage >= 60) return "bearish";
    if (Math.abs(bullish.percentage - bearish.percentage) < 20) return "mixed";
    return "neutral";
  };

  const overall = getOverallSentiment();

  // Style mappings
  const sentimentStyles: Record<string, string> = {
    bullish: "text-green-600 bg-green-500/10 border-green-500/20",
    bearish: "text-red-600 bg-red-500/10 border-red-500/20",
    neutral: "text-gray-600 bg-gray-500/10 border-gray-500/20",
    mixed: "text-orange-600 bg-orange-500/10 border-orange-500/20",
  };

  const strengthStyles: Record<string, string> = {
    strong: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    moderate: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    weak: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    mixed: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  };

  // Format relative time
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Card>
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Newspaper className="h-5 w-5" />
          News Sentiment
        </CardTitle>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {formatTimeAgo(lastUpdated)}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            title="Refresh news sentiment"
          >
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stale Data Notice */}
        {data.isStale && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium">Using cached analysis</span>
              {data.staleReason && (
                <p className="mt-0.5 text-xs opacity-80">{data.staleReason}</p>
              )}
            </div>
          </div>
        )}

        {/* Sentiment Overview Card */}
        <div
          className={cn(
            "rounded-lg border p-4 transition-colors",
            sentimentStyles[overall]
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {overall === "bullish" && <TrendingUp className="h-5 w-5" />}
              {overall === "bearish" && <TrendingDown className="h-5 w-5" />}
              {(overall === "neutral" || overall === "mixed") && (
                <Minus className="h-5 w-5" />
              )}
              <span className="font-semibold capitalize text-lg">{overall}</span>
            </div>
            <span className="text-sm opacity-80">
              Based on {articleCount || 0} articles
            </span>
          </div>

          {/* Percentage Breakdown */}
          {breakdown && (
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-green-600">
                  {breakdown.bullish.percentage.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Bullish</div>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-500">
                  {breakdown.neutral.percentage.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Neutral</div>
              </div>
              <div>
                <div className="text-xl font-bold text-red-600">
                  {breakdown.bearish.percentage.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Bearish</div>
              </div>
            </div>
          )}
        </div>

        {/* AI Analysis Section */}
        {aiAnalysis?.summary && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">AI Analysis</span>
              {aiAnalysis.sentimentStrength && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs capitalize",
                    strengthStyles[aiAnalysis.sentimentStrength]
                  )}
                >
                  {aiAnalysis.sentimentStrength} signal
                </Badge>
              )}
              {aiAnalysis.confidence && (
                <Badge variant="outline" className="text-xs capitalize">
                  {aiAnalysis.confidence} confidence
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {aiAnalysis.summary}
            </p>

            {/* Key Themes */}
            {aiAnalysis.keyThemes && aiAnalysis.keyThemes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(aiAnalysis.keyThemes as string[]).map((theme, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="text-xs font-normal"
                  >
                    {theme}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Headlines */}
        {recentArticles && recentArticles.length > 0 && (
          <div className="space-y-3">
            <span className="text-sm font-semibold">Latest Headlines</span>
            <div className="space-y-2">
              {recentArticles.slice(0, 3).map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {article.headline}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">{article.source}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(article.publishedAt)}</span>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

// Stock Stats Component
// Shows key statistics about a stock (price, change, volume, etc.)
// This is a client component because it fetches data and has loading states.

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockQuote {
  symbol: string;
  shortName: string;
  longName: string | null;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  marketCap: number | null;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  averageVolume: number;
}

interface StockStatsProps {
  symbol: string;
}

// Helper to format large numbers (1000000 -> 1M)
function formatNumber(num: number): string {
  if (num >= 1_000_000_000_000) {
    return `${(num / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toFixed(2);
}

export function StockStats({ symbol }: StockStatsProps) {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuote() {
      setLoading(true);
      try {
        const response = await fetch(`/api/stocks/${symbol}`);
        if (!response.ok) throw new Error("Failed to fetch quote");
        const data = await response.json();
        setQuote(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchQuote();
  }, [symbol]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-12 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg">
        {error || "Failed to load stock data"}
      </div>
    );
  }

  const isPositive = quote.regularMarketChange >= 0;
  const isNeutral = quote.regularMarketChange === 0;

  return (
    <div>
      {/* Stock name and symbol */}
      <div className="mb-1">
        <span className="text-gray-500 text-sm">{quote.symbol}</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">
        {quote.longName || quote.shortName}
      </h1>

      {/* Current price */}
      <div className="flex items-baseline gap-3 mb-6">
        <span className="text-4xl font-bold">
          ${quote.regularMarketPrice.toFixed(2)}
        </span>
        <div
          className={cn(
            "flex items-center gap-1 text-lg font-medium",
            isNeutral
              ? "text-gray-500"
              : isPositive
              ? "text-green-600"
              : "text-red-600"
          )}
        >
          {isNeutral ? (
            <Minus className="w-5 h-5" />
          ) : isPositive ? (
            <TrendingUp className="w-5 h-5" />
          ) : (
            <TrendingDown className="w-5 h-5" />
          )}
          <span>
            {isPositive ? "+" : ""}
            {quote.regularMarketChange.toFixed(2)} (
            {quote.regularMarketChangePercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Key stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Volume" value={formatNumber(quote.regularMarketVolume)} />
        <StatCard
          label="Avg Volume"
          value={formatNumber(quote.averageVolume)}
        />
        <StatCard
          label="Market Cap"
          value={quote.marketCap ? formatNumber(quote.marketCap) : "N/A"}
        />
        <StatCard
          label="52W Range"
          value={`$${quote.fiftyTwoWeekLow.toFixed(0)} - $${quote.fiftyTwoWeekHigh.toFixed(0)}`}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

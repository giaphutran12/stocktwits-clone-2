'use client';

/**
 * TrendingSidebar Component
 *
 * What is this?
 * A sticky sidebar that shows the top 10 trending stock tickers from the last 24 hours.
 * It automatically fetches data from the /api/trending endpoint and displays it in a
 * ranked list format.
 *
 * Why client component?
 * We need to use React hooks (useState, useEffect) to fetch data on mount and manage
 * loading states. Client components allow us to use these interactive features.
 *
 * How it works:
 * 1. On mount, fetch trending data from /api/trending
 * 2. Show loading skeletons while waiting for data
 * 3. Display ranked list of tickers with post counts
 * 4. Each ticker is clickable and links to its stock page
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// TypeScript interface - defines the shape of a trending ticker object
interface TrendingTicker {
  symbol: string;
  count: number;
}

export function TrendingSidebar() {
  // State management
  // - trending: array of ticker objects or null if not loaded yet
  // - loading: boolean to track if we're fetching data
  const [trending, setTrending] = useState<TrendingTicker[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // useEffect runs when component mounts (empty dependency array = run once)
  useEffect(() => {
    // Define async function inside useEffect (useEffect itself can't be async)
    async function fetchTrending() {
      try {
        const response = await fetch('/api/trending');

        if (!response.ok) {
          throw new Error('Failed to fetch trending tickers');
        }

        const data = await response.json();
        setTrending(data.trending);
      } catch (error) {
        console.error('Error fetching trending tickers:', error);
        // On error, set empty array so we don't show loading forever
        setTrending([]);
      } finally {
        // Always set loading to false, whether we succeed or fail
        setIsLoading(false);
      }
    }

    fetchTrending();
  }, []); // Empty array = only run on mount, not on re-renders

  return (
    <Card className="sticky top-20 w-full max-w-[280px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🔥</span>
          <span>Trending</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Show loading skeletons while fetching */}
        {isLoading && (
          <div className="space-y-3">
            {/* Create 5 skeleton rows */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        )}

        {/* Show trending list when data is loaded */}
        {!isLoading && trending && trending.length > 0 && (
          <div className="space-y-2">
            {trending.map((ticker, index) => (
              <Link
                key={ticker.symbol}
                href={`/stock/${ticker.symbol}`}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
              >
                {/* Rank number */}
                <span className="text-muted-foreground text-sm font-medium w-4">
                  {index + 1}.
                </span>

                {/* Ticker symbol */}
                <span className="font-semibold text-sm">
                  ${ticker.symbol}
                </span>

                {/* Post count */}
                <span className="text-muted-foreground ml-auto text-xs">
                  {ticker.count} {ticker.count === 1 ? 'post' : 'posts'}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Show message if no trending tickers */}
        {!isLoading && trending && trending.length === 0 && (
          <p className="text-muted-foreground text-center text-sm">
            No trending tickers yet. Start posting!
          </p>
        )}
      </CardContent>
    </Card>
  );
}

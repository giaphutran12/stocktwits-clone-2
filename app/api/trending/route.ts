/**
 * /api/trending - Trending tickers endpoint
 *
 * GET: Fetch trending tickers from cache or calculate fresh data if cache is stale
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Cache duration - if cache is older than this, we recalculate
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/trending - Fetch trending tickers
 *
 * How it works:
 * 1. First, try to read from the TrendingCache table
 * 2. If cache exists and is fresh (< 10 min old), return it
 * 3. If cache is stale or doesn't exist, calculate fresh trending data
 * 4. Save the fresh data to cache and return it
 *
 * Why cache?
 * Calculating trending data requires a complex database query (groupBy with count).
 * Instead of running this query on every request, we cache the results and refresh
 * them periodically via a cron job. This keeps the API fast!
 *
 * Response format:
 * {
 *   trending: Array<{ symbol: string, count: number }>,
 *   updatedAt: string (ISO date)
 * }
 */
export async function GET() {
  try {
    // Step 1: Try to get cached trending data
    const cache = await db.trendingCache.findUnique({
      where: { id: 'singleton' },
    });

    // Step 2: Check if cache is fresh
    const now = Date.now();
    if (cache) {
      const cacheAge = now - new Date(cache.updatedAt).getTime();

      // If cache is fresh, return it immediately
      if (cacheAge < CACHE_DURATION_MS) {
        return NextResponse.json({
          trending: cache.data,
          updatedAt: cache.updatedAt.toISOString(),
        });
      }
    }

    // Step 3: Cache is stale or doesn't exist - calculate fresh data
    const trending = await calculateTrending();

    // Step 4: Save to cache (upsert = update if exists, create if doesn't)
    const updatedCache = await db.trendingCache.upsert({
      where: { id: 'singleton' },
      update: {
        data: trending,
      },
      create: {
        id: 'singleton',
        data: trending,
      },
    });

    // Step 5: Return fresh data
    return NextResponse.json({
      trending: updatedCache.data,
      updatedAt: updatedCache.updatedAt.toISOString(),
    });

  } catch (error) {
    console.error('Error fetching trending tickers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending tickers' },
      { status: 500 }
    );
  }
}

/**
 * Calculate trending tickers
 *
 * What this does:
 * 1. Look at all posts from the last 24 hours
 * 2. Count how many times each ticker was mentioned
 * 3. Return the top 10 most-mentioned tickers
 *
 * How it works:
 * - Uses Prisma's groupBy to group PostTicker records by symbol
 * - Counts how many posts mention each ticker
 * - Filters to only posts from the last 24 hours
 * - Sorts by count descending and takes top 10
 *
 * Returns: Array<{ symbol: string, count: number }>
 */
async function calculateTrending() {
  // Calculate the cutoff time (24 hours ago)
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Query: Group tickers by symbol, count occurrences, filter by date
  const trending = await db.postTicker.groupBy({
    by: ['symbol'],
    _count: { symbol: true },
    where: {
      post: { createdAt: { gte: last24h } },
    },
    orderBy: { _count: { symbol: 'desc' } },
    take: 10,
  });

  // Transform the result to match our expected format
  // From: [{ symbol: "AAPL", _count: { symbol: 42 } }]
  // To:   [{ symbol: "AAPL", count: 42 }]
  return trending.map((item) => ({
    symbol: item.symbol,
    count: item._count.symbol,
  }));
}

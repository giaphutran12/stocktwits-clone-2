// Inngest Functions - Background jobs that process events
//
// What is this file? (Simple explanation)
// This defines the "workers" that handle background tasks.
// When an event is sent (like "post/created"), Inngest finds the
// matching function and runs it - completely separate from the API request.
//
// Why separate from the API?
// - API stays fast (returns immediately)
// - Job runs reliably (won't get killed when response is sent)
// - Automatic retries if something fails
// - You can see job status in the Inngest dashboard

import { inngest } from "../inngest";
import { db } from "../db";
import { analyzePost } from "../anthropic"; // Switched from Gemini to Anthropic

/**
 * Analyze Post Function
 *
 * Triggered when: A new post is created (event: "post/created")
 *
 * What it does:
 * 1. Receives the postId, content, and tickers from the event
 * 2. Calls Gemini AI to analyze the post
 * 3. Updates the database with the analysis results
 *
 * Retries: Inngest automatically retries on failure (default: 3 times)
 */
export const analyzePostFunction = inngest.createFunction(
  {
    id: "analyze-post",
    // Retry configuration - if Gemini fails or rate limits, retry
    retries: 3,
  },
  { event: "post/created" },
  async ({ event, logger }) => {
    const { postId, content, tickers } = event.data;

    logger.info(`Starting analysis for post ${postId}`);

    // Step 1: Call Gemini to analyze the post
    const analysis = await analyzePost(content, tickers);

    logger.info(`Analysis complete for post ${postId}`, { analysis });

    // Step 2: Update the database with results
    await db.post.update({
      where: { id: postId },
      data: {
        qualityScore: analysis.qualityScore,
        insightType: analysis.insightType,
        sector: analysis.sector,
        summary: analysis.summary,
      },
    });

    logger.info(`Database updated for post ${postId}`);

    // Return value is stored in Inngest for debugging
    return {
      success: true,
      postId,
      qualityScore: analysis.qualityScore,
    };
  }
);

/**
 * Refresh Trending Function
 *
 * Triggered when: Every 5 minutes (cron schedule)
 *
 * What it does:
 * 1. Calculates trending tickers from the last 24 hours
 * 2. Updates the TrendingCache table with fresh data
 *
 * Why a cron job?
 * Instead of calculating trending data on every API request (expensive!),
 * we pre-calculate it periodically and store it in the cache. This makes
 * the /api/trending endpoint super fast!
 *
 * Cron syntax: Runs every 5 minutes
 */
export const refreshTrendingFunction = inngest.createFunction(
  {
    id: "refresh-trending",
  },
  { cron: "*/5 * * * *" }, // Every 5 minutes
  async ({ logger }) => {
    logger.info("Starting trending ticker refresh");

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
    const trendingData = trending.map((item) => ({
      symbol: item.symbol,
      count: item._count.symbol,
    }));

    logger.info(`Calculated trending tickers: ${trendingData.length} tickers`, {
      tickers: trendingData.map(t => t.symbol),
    });

    // Update cache (upsert = update if exists, create if doesn't)
    await db.trendingCache.upsert({
      where: { id: 'singleton' },
      update: {
        data: trendingData,
      },
      create: {
        id: 'singleton',
        data: trendingData,
      },
    });

    logger.info("Trending cache updated successfully");

    return {
      success: true,
      trendingCount: trendingData.length,
    };
  }
);

// Export all functions as an array for the serve() handler
export const functions = [analyzePostFunction, refreshTrendingFunction];
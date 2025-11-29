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
import { getCompanyNews } from "@/lib/finnhub";
import { analyzeNewsSentiment } from "@/lib/anthropic";

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

// ============================================
// NEWS SENTIMENT JOBS
// ============================================

/**
 * Refreshes news sentiment for all stocks with community activity.
 *
 * Runs every 30 minutes via cron.
 *
 * For each active stock:
 * 1. Fetch news from Finnhub API (company-news endpoint - FREE tier)
 * 2. Send headlines to Claude to classify and calculate sentiment percentages
 * 3. Generate AI summary with key themes
 * 4. Cache results in NewsSentimentCache table
 * 5. Store articles in NewsArticle table
 *
 * Note: We use Claude for sentiment percentages because Finnhub's
 * /news-sentiment endpoint requires a paid subscription (~$50/month).
 */
export const refreshNewsSentimentFunction = inngest.createFunction(
  {
    id: "refresh-news-sentiment",
    retries: 2,
  },
  { cron: "*/30 * * * *" }, // Every 30 minutes
  async ({ logger }) => {
    logger.info("Starting news sentiment refresh job");

    // 1. Get all stocks that have community posts (active stocks)
    const activeSymbols = await db.postTicker.findMany({
      select: { symbol: true },
      distinct: ["symbol"],
    });

    logger.info(`Found ${activeSymbols.length} active stocks to process`);

    const results: Array<{
      symbol: string;
      success: boolean;
      error?: string;
      articleCount?: number;
    }> = [];

    // 2. Process each symbol
    for (const { symbol } of activeSymbols) {
      try {
        logger.info(`Processing ${symbol}...`);

        // Fetch company news from Finnhub (FREE tier)
        // Note: getNewsSentiment() requires PAID tier, so we use Claude to calculate percentages
        const articles = await getCompanyNews(symbol, 7); // Last 7 days

        // Skip if not enough articles for meaningful analysis
        if (articles.length < 3) {
          logger.info(`Not enough articles for ${symbol} (${articles.length}), skipping`);
          results.push({ symbol, success: false, error: "Not enough articles" });
          continue;
        }

        // Prepare articles for AI analysis
        const articleData = articles.slice(0, 10).map((a: { headline: string; summary?: string; source: string }) => ({
          headline: a.headline,
          summary: a.summary || null,
          source: a.source,
        }));

        // Get AI analysis from Claude (includes percentages calculation)
        const aiAnalysis = await analyzeNewsSentiment(symbol, articleData);

        // Calculate companyNewsScore from percentages: (bullish - bearish) / 100 gives -1 to 1 range
        const companyNewsScore =
          (aiAnalysis.bullishPercent - aiAnalysis.bearishPercent) / 100;

        // Upsert sentiment cache with Claude's percentages
        await db.newsSentimentCache.upsert({
          where: { symbol },
          create: {
            symbol,
            bullishPercent: aiAnalysis.bullishPercent,
            bearishPercent: aiAnalysis.bearishPercent,
            neutralPercent: aiAnalysis.neutralPercent,
            companyNewsScore,
            articleCount: articles.length,
            summary: aiAnalysis.summary,
            keyThemes: aiAnalysis.keyThemes,
            sentimentStrength: aiAnalysis.sentimentStrength,
            confidence: aiAnalysis.confidence,
          },
          update: {
            bullishPercent: aiAnalysis.bullishPercent,
            bearishPercent: aiAnalysis.bearishPercent,
            neutralPercent: aiAnalysis.neutralPercent,
            companyNewsScore,
            articleCount: articles.length,
            summary: aiAnalysis.summary,
            keyThemes: aiAnalysis.keyThemes,
            sentimentStrength: aiAnalysis.sentimentStrength,
            confidence: aiAnalysis.confidence,
          },
        });

        // Store individual articles (upsert to handle duplicates)
        const articlesToStore = articles.slice(0, 20); // Keep top 20 per stock
        for (const article of articlesToStore) {
          await db.newsArticle.upsert({
            where: {
              symbol_url: { symbol, url: article.url },
            },
            create: {
              symbol,
              headline: article.headline,
              summary: article.summary || null,
              source: article.source,
              url: article.url,
              imageUrl: article.image || null,
              publishedAt: new Date(article.datetime * 1000), // Convert UNIX timestamp
            },
            update: {
              headline: article.headline,
              summary: article.summary || null,
            },
          });
        }

        results.push({
          symbol,
          success: true,
          articleCount: articlesToStore.length
        });

        // Rate limiting: Finnhub allows 60 calls/min
        // We make 1 call per symbol (company-news), so wait 1 second between symbols
        // This allows ~60 symbols per minute, safe margin
        await new Promise((resolve) => setTimeout(resolve, 1000));

      } catch (error) {
        logger.error(`Error processing ${symbol}:`, { error: String(error) });
        results.push({ symbol, success: false, error: String(error) });
      }
    }

    // 3. Log summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger.info(
      `News sentiment refresh complete: ${successful} succeeded, ${failed} failed`
    );

    return {
      processed: results.length,
      successful,
      failed,
      results,
    };
  }
);

/**
 * Cleans up old news articles to prevent database bloat.
 *
 * Runs daily at 3 AM UTC.
 * Deletes NewsArticle records older than 7 days.
 */
export const cleanupOldNewsFunction = inngest.createFunction(
  {
    id: "cleanup-old-news",
    retries: 1,
  },
  { cron: "0 3 * * *" }, // Every day at 3 AM UTC
  async ({ logger }) => {
    logger.info("Starting old news cleanup job");

    // Calculate cutoff date (7 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    // Delete old articles
    const deleted = await db.newsArticle.deleteMany({
      where: {
        publishedAt: { lt: cutoffDate },
      },
    });

    logger.info(`Deleted ${deleted.count} news articles older than 7 days`);

    return {
      deletedCount: deleted.count,
      cutoffDate: cutoffDate.toISOString(),
    };
  }
);

// Export all functions as an array for the serve() handler
export const functions = [analyzePostFunction, refreshTrendingFunction, refreshNewsSentimentFunction, cleanupOldNewsFunction];
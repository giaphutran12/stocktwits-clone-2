import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCompanyNews } from "@/lib/finnhub";
import { analyzeNewsSentiment } from "@/lib/anthropic";

// Required for Anthropic SDK (can't run on Edge runtime)
export const runtime = "nodejs";

/**
 * GET /api/stocks/[symbol]/news-sentiment
 *
 * Returns news sentiment analysis for a stock.
 *
 * Query params:
 * - refresh=true: Force refresh from Finnhub (bypasses cache)
 *
 * Response:
 * - available: boolean - Whether data exists for this stock
 * - breakdown: { bullish, bearish, neutral } percentages
 * - companyNewsScore: -1 to 1 overall score
 * - articleCount: Number of articles analyzed
 * - aiAnalysis: { summary, keyThemes, sentimentStrength, confidence }
 * - recentArticles: Array of latest headlines
 * - lastUpdated: ISO timestamp
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const upperSymbol = symbol.toUpperCase();
    const forceRefresh = req.nextUrl.searchParams.get("refresh") === "true";

    // 1. Check cache
    let cached = await db.newsSentimentCache.findUnique({
      where: { symbol: upperSymbol },
    });

    // 2. Determine if cache is fresh (less than 30 minutes old)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const isCacheFresh = cached && cached.lastUpdated > thirtyMinutesAgo;

    // 3. Fetch fresh data if needed
    if (forceRefresh || !isCacheFresh) {
      console.log(
        `[News Sentiment API] ${forceRefresh ? "Force refresh" : "Cache miss/stale"} for ${upperSymbol}`
      );

      // Fetch company news from Finnhub (FREE tier)
      // Note: getNewsSentiment() requires PAID tier, so we use Claude to calculate percentages
      const articles = await getCompanyNews(upperSymbol, 7);

      // Need at least 3 articles for meaningful analysis
      // FALLBACK: If not enough articles, use stale cache if available
      if (articles.length < 3) {
        console.log(
          `[News Sentiment API] Not enough articles for ${upperSymbol} (${articles.length}), checking for stale cache fallback`
        );

        // Check if we have cached data to fall back to
        if (cached) {
          console.log(
            `[News Sentiment API] Using stale cache for ${upperSymbol} (last updated: ${cached.lastUpdated.toISOString()})`
          );

          // Fetch recent articles from database (they may be old but still useful)
          const recentArticles = await db.newsArticle.findMany({
            where: { symbol: upperSymbol },
            orderBy: { publishedAt: "desc" },
            take: 5,
            select: {
              id: true,
              headline: true,
              source: true,
              url: true,
              imageUrl: true,
              publishedAt: true,
              sentiment: true,
            },
          });

          // Return stale cache with isStale flag
          return NextResponse.json({
            symbol: upperSymbol,
            available: true,
            isStale: true,
            staleReason: `Not enough recent news articles (${articles.length} found, 3 required). Showing previous analysis.`,
            breakdown: {
              bullish: { percentage: cached.bullishPercent },
              bearish: { percentage: cached.bearishPercent },
              neutral: { percentage: cached.neutralPercent },
            },
            companyNewsScore: cached.companyNewsScore,
            articleCount: cached.articleCount,
            aiAnalysis: {
              summary: cached.summary,
              keyThemes: cached.keyThemes,
              sentimentStrength: cached.sentimentStrength,
              confidence: cached.confidence,
            },
            recentArticles,
            lastUpdated: cached.lastUpdated.toISOString(),
          });
        }

        // No cache available at all - show unavailable message
        return NextResponse.json({
          symbol: upperSymbol,
          available: false,
          message:
            "Not enough news articles found for analysis. Try a more popular ticker.",
        });
      }

      // Format articles for Claude
      const articleData = articles.slice(0, 10).map((a) => ({
        headline: a.headline,
        summary: a.summary || null,
        source: a.source,
      }));

      // Claude analyzes headlines AND calculates percentages
      const aiAnalysis = await analyzeNewsSentiment(upperSymbol, articleData);

      // Calculate companyNewsScore from percentages: (bullish - bearish) / 100 gives -1 to 1 range
      const companyNewsScore =
        (aiAnalysis.bullishPercent - aiAnalysis.bearishPercent) / 100;

      // Upsert cache with Claude's percentages
      cached = await db.newsSentimentCache.upsert({
        where: { symbol: upperSymbol },
        create: {
          symbol: upperSymbol,
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

      // Also store articles for display
      for (const article of articles.slice(0, 10)) {
        await db.newsArticle.upsert({
          where: {
            symbol_url: { symbol: upperSymbol, url: article.url },
          },
          create: {
            symbol: upperSymbol,
            headline: article.headline,
            summary: article.summary || null,
            source: article.source,
            url: article.url,
            imageUrl: article.image || null,
            publishedAt: new Date(article.datetime * 1000),
          },
          update: {
            headline: article.headline,
            summary: article.summary || null,
          },
        });
      }
    }

    // 4. Fetch recent articles to display
    const recentArticles = await db.newsArticle.findMany({
      where: { symbol: upperSymbol },
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: {
        id: true,
        headline: true,
        source: true,
        url: true,
        imageUrl: true,
        publishedAt: true,
        sentiment: true,
      },
    });

    // 5. Return response
    if (!cached) {
      return NextResponse.json({
        symbol: upperSymbol,
        available: false,
        message: "No news sentiment data available for this stock. Try a more popular ticker like AAPL or TSLA.",
      });
    }

    return NextResponse.json({
      symbol: upperSymbol,
      available: true,
      breakdown: {
        bullish: { percentage: cached.bullishPercent },
        bearish: { percentage: cached.bearishPercent },
        neutral: { percentage: cached.neutralPercent },
      },
      companyNewsScore: cached.companyNewsScore,
      articleCount: cached.articleCount,
      aiAnalysis: {
        summary: cached.summary,
        keyThemes: cached.keyThemes,
        sentimentStrength: cached.sentimentStrength,
        confidence: cached.confidence,
      },
      recentArticles,
      lastUpdated: cached.lastUpdated.toISOString(),
    });

  } catch (error) {
    console.error("[News Sentiment API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch news sentiment", details: String(error) },
      { status: 500 }
    );
  }
}

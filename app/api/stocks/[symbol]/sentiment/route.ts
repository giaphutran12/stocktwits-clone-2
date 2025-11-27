/**
 * /api/stocks/[symbol]/sentiment - Community Sentiment Analysis
 *
 * GET: Fetch aggregated sentiment data for posts mentioning this ticker
 *
 * Query params:
 * - period: "24h" | "7d" | "30d" (default: "24h")
 *
 * Response:
 * {
 *   symbol: "AAPL",
 *   period: "24h",
 *   total: 47,
 *   breakdown: { bullish: { count, percentage }, bearish: {...}, neutral: {...} },
 *   aiSummary: { summary, keyThemes, sentimentStrength, confidence },
 *   qualityPostCount: 32,
 *   updatedAt: "2024-01-15T10:30:00Z"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyzeCommunitySentiment } from "@/lib/anthropic";

// Required for Anthropic SDK (can't run on Edge runtime)
export const runtime = "nodejs";

// Valid time periods
type TimePeriod = "24h" | "7d" | "30d";
const VALID_PERIODS: TimePeriod[] = ["24h", "7d", "30d"];

/**
 * Calculate the cutoff date based on period
 */
function getDateCutoff(period: TimePeriod): Date {
  const now = new Date();
  switch (period) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const upperSymbol = symbol.toUpperCase();

    // Parse and validate period query param
    const searchParams = req.nextUrl.searchParams;
    const periodParam = searchParams.get("period") || "24h";
    const period: TimePeriod = VALID_PERIODS.includes(periodParam as TimePeriod)
      ? (periodParam as TimePeriod)
      : "24h";

    const cutoffDate = getDateCutoff(period);

    // Step 1: Count posts by sentiment for this ticker within the time period
    // Uses Prisma groupBy - same pattern as /api/trending
    const sentimentCounts = await db.post.groupBy({
      by: ["sentiment"],
      _count: { sentiment: true },
      where: {
        tickers: { some: { symbol: upperSymbol } },
        createdAt: { gte: cutoffDate },
      },
    });

    // Step 2: Calculate totals and percentages
    const total = sentimentCounts.reduce((sum, s) => sum + s._count.sentiment, 0);

    const breakdown = {
      bullish: { count: 0, percentage: 0 },
      bearish: { count: 0, percentage: 0 },
      neutral: { count: 0, percentage: 0 },
    };

    sentimentCounts.forEach((item) => {
      const key = item.sentiment.toLowerCase() as keyof typeof breakdown;
      breakdown[key] = {
        count: item._count.sentiment,
        percentage: total > 0 ? Math.round((item._count.sentiment / total) * 100) : 0,
      };
    });

    // Step 3: Fetch quality posts for AI analysis (qualityScore > 0.4)
    // Only fetch if we have enough posts
    let aiSummary = null;
    let qualityPostCount = 0;

    if (total >= 3) {
      const qualityPosts = await db.post.findMany({
        where: {
          tickers: { some: { symbol: upperSymbol } },
          createdAt: { gte: cutoffDate },
          qualityScore: { gt: 0.4 },
        },
        orderBy: { qualityScore: "desc" },
        take: 10,
        select: {
          content: true,
          sentiment: true,
          qualityScore: true,
        },
      });

      qualityPostCount = qualityPosts.length;

      // Only call AI if we have at least 3 quality posts
      if (qualityPostCount >= 3) {
        aiSummary = await analyzeCommunitySentiment(
          upperSymbol,
          period,
          qualityPosts.map((p) => ({
            content: p.content,
            sentiment: p.sentiment,
            qualityScore: p.qualityScore,
          })),
          {
            bullish: breakdown.bullish.percentage,
            bearish: breakdown.bearish.percentage,
            neutral: breakdown.neutral.percentage,
          }
        );
      }
    }

    // Step 4: Return aggregated data
    return NextResponse.json({
      symbol: upperSymbol,
      period,
      total,
      breakdown,
      aiSummary,
      qualityPostCount,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching community sentiment:", error);
    return NextResponse.json(
      { error: "Failed to fetch community sentiment" },
      { status: 500 }
    );
  }
}

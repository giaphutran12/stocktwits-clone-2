// API Route: POST /api/posts/[id]/analyze
// This endpoint analyzes a post using Gemini AI and updates the database
//
// What it does (simple explanation):
// - Takes a post ID from the URL
// - Fetches the post from the database
// - Sends it to Gemini for AI analysis
// - Saves the analysis results back to the database
// - Returns the updated post
//
// Technical details:
// - Uses dynamic route segment [id] for the post ID
// - Calls the Gemini service wrapper (lib/gemini.ts)
// - Updates qualityScore, insightType, sector, summary fields

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyzePost } from "@/lib/gemini";

// Force Node.js runtime (Gemini SDK may not work in Edge)
export const runtime = "nodejs";

/**
 * POST /api/posts/[id]/analyze
 *
 * Analyzes a post with Gemini AI and updates the database
 *
 * URL params:
 * - id: The post ID to analyze
 *
 * Returns:
 * - 200: Analysis complete, returns updated post
 * - 404: Post not found
 * - 500: Analysis or database error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the post ID from the URL params
    // In Next.js 15+, params is a Promise that needs to be awaited
    const { id } = await params;

    // Step 1: Fetch the post from database
    // We need the content and tickers to analyze
    const post = await db.post.findUnique({
      where: { id },
      include: {
        tickers: true, // Include the stock tickers mentioned
      },
    });

    // If post doesn't exist, return 404
    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Step 2: Extract ticker symbols from the post
    // The tickers relation gives us PostTicker objects, we just need the symbols
    const tickerSymbols = post.tickers.map((t) => t.symbol);

    // Step 3: Call Gemini to analyze the post
    // This returns qualityScore, insightType, sector, summary
    console.log(`[Analyze] Starting analysis for post ${id}`);
    const analysis = await analyzePost(post.content, tickerSymbols);
    console.log(`[Analyze] Analysis complete for post ${id}:`, analysis);

    // Step 4: Update the post with analysis results
    const updatedPost = await db.post.update({
      where: { id },
      data: {
        qualityScore: analysis.qualityScore,
        insightType: analysis.insightType,
        sector: analysis.sector,
        summary: analysis.summary,
      },
      include: {
        author: true,
        tickers: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    // Step 5: Return the updated post
    return NextResponse.json({
      success: true,
      post: {
        id: updatedPost.id,
        content: updatedPost.content,
        sentiment: updatedPost.sentiment,
        qualityScore: updatedPost.qualityScore,
        insightType: updatedPost.insightType,
        sector: updatedPost.sector,
        summary: updatedPost.summary,
        createdAt: updatedPost.createdAt,
        author: {
          id: updatedPost.author.id,
          username: updatedPost.author.username,
          name: updatedPost.author.name,
          imageUrl: updatedPost.author.imageUrl,
        },
        tickers: updatedPost.tickers.map((t) => ({ symbol: t.symbol })),
        _count: updatedPost._count,
      },
    });
  } catch (error) {
    // Log the error for debugging
    console.error("[Analyze] Error:", error);

    // Return a generic error response
    // We don't expose internal error details to the client
    return NextResponse.json(
      { error: "Failed to analyze post" },
      { status: 500 }
    );
  }
}

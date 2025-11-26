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

// Export all functions as an array for the serve() handler
export const functions = [analyzePostFunction];
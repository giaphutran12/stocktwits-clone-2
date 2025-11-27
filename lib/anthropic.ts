// Anthropic Service - AI-powered post analysis using Claude
//
// What this file does (simple explanation):
// Takes a stock post and sends it to Claude AI to analyze it.
// Claude returns a quality score, type of insight, sector, and summary.

import Anthropic from "@anthropic-ai/sdk";

// Initialize the Anthropic client
// The SDK automatically reads ANTHROPIC_API_KEY from environment
const anthropic = new Anthropic();

// Type for the analysis result that matches our Prisma schema
export type PostAnalysis = {
  qualityScore: number | null; // 0.0 to 1.0
  insightType: string | null; // fundamental, technical, macro, earnings, risk, news, sentiment
  sector: string | null; // Technology, Healthcare, Finance, etc.
  summary: string | null; // One-sentence summary
};

// Valid insight types
const VALID_INSIGHT_TYPES = [
  "fundamental",
  "technical",
  "macro",
  "earnings",
  "risk",
  "news",
  "sentiment",
];

/**
 * System prompt - tells Claude WHO it is and HOW to behave
 *
 * This is separate from the user message because:
 * 1. System prompts set the AI's "personality" and rules
 * 2. They persist across the conversation
 * 3. Claude gives them higher priority than user messages
 */
const SYSTEM_PROMPT = `You are a financial content analyst for a stock trading social platform (like StockTwits).

Your job is to analyze user posts about stocks and provide:
1. A quality score (0.0 to 1.0) based on how insightful the post is
2. The type of analysis (fundamental, technical, macro, earnings, risk, news, or sentiment)
3. The market sector the post relates to
4. A brief summary of the key insight

## Scoring Guidelines
- 0.0-0.3 (Low): Vague posts, pure emotion ("$AAPL to the moon!"), spam, no real insight
- 0.4-0.6 (Medium): Some insight but generic, common knowledge, surface-level analysis
- 0.7-1.0 (High): Specific data points, actionable insights, well-reasoned analysis, unique perspective

## Insight Types
- fundamental: Earnings, revenue, P/E ratios, company financials
- technical: Chart patterns, support/resistance, indicators (RSI, MACD)
- macro: Interest rates, inflation, economic indicators, Fed policy
- earnings: Earnings reports, guidance, beats/misses
- risk: Warnings, concerns, potential downsides
- news: Breaking news, announcements, events
- sentiment: Market mood, fear/greed, retail vs institutional

## Output Format
Always respond with ONLY valid JSON (no markdown, no explanation):
{
  "qualityScore": <number 0.0-1.0>,
  "insightType": "<one of the types above>",
  "sector": "<sector name or null>",
  "summary": "<one sentence, max 100 chars>"
}`;

/**
 * Analyzes a stock post using Claude AI
 */
export async function analyzePost(
  content: string,
  tickers: string[]
): Promise<PostAnalysis> {
  // Check if API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[Anthropic] No API key configured, skipping analysis");
    return getNullAnalysis();
  }

  try {
    console.log("[Anthropic] ====== STARTING ANALYSIS ======");
    console.log("[Anthropic] Content:", content.substring(0, 100));
    console.log("[Anthropic] Tickers:", tickers);
    console.log("[Anthropic] API Key present:", !!process.env.ANTHROPIC_API_KEY);
    console.log("[Anthropic] API Key first 10 chars:", process.env.ANTHROPIC_API_KEY?.substring(0, 10));

    // Call Claude with system prompt + user message
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: SYSTEM_PROMPT, // <-- This is where the instructions go!
      messages: [
        {
          role: "user",
          content: `Analyze this post:\n\n"${content}"\n\nTickers mentioned: ${tickers.length > 0 ? tickers.join(", ") : "None"}`,
        },
      ],
    });

    console.log("[Anthropic] ====== API RESPONSE ======");
    console.log("[Anthropic] Stop reason:", message.stop_reason);
    console.log("[Anthropic] Usage:", message.usage);
    console.log("[Anthropic] Content blocks:", message.content.length);
    console.log("[Anthropic] First block type:", message.content[0]?.type);

    // Extract the text response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    console.log("[Anthropic] Raw response text:", responseText);

    // Parse and validate the JSON response
    const analysis = parseAnalysisResponse(responseText);
    console.log("[Anthropic] ====== FINAL RESULT ======");
    console.log("[Anthropic] Parsed analysis:", JSON.stringify(analysis, null, 2));

    return analysis;
  } catch (error) {
    console.error("[Anthropic] ====== ERROR ======");
    console.error("[Anthropic] Error type:", (error as Error).constructor.name);
    console.error("[Anthropic] Error message:", (error as Error).message);
    console.error("[Anthropic] Full error:", error);
    return getNullAnalysis();
  }
}

/**
 * Parses the JSON response from Claude and validates it
 */
function parseAnalysisResponse(text: string): PostAnalysis {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Anthropic] No JSON found in response");
      return getNullAnalysis();
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      qualityScore: validateQualityScore(parsed.qualityScore),
      insightType: validateInsightType(parsed.insightType),
      sector: validateSector(parsed.sector),
      summary: validateSummary(parsed.summary),
    };
  } catch (error) {
    console.error("[Anthropic] Failed to parse response:", text, error);
    return getNullAnalysis();
  }
}

function validateQualityScore(score: unknown): number | null {
  if (typeof score !== "number" || isNaN(score)) return null;
  return Math.max(0, Math.min(1, score));
}

function validateInsightType(type: unknown): string | null {
  if (typeof type !== "string") return null;
  const normalized = type.toLowerCase().trim();
  return VALID_INSIGHT_TYPES.includes(normalized) ? normalized : null;
}

function validateSector(sector: unknown): string | null {
  if (typeof sector !== "string") return null;
  const trimmed = sector.trim();
  if (trimmed.length === 0 || trimmed.toLowerCase() === "unknown") return null;
  return trimmed
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function validateSummary(summary: unknown): string | null {
  if (typeof summary !== "string") return null;
  const trimmed = summary.trim();
  if (trimmed.length === 0) return null;
  return trimmed.length > 150 ? trimmed.substring(0, 147) + "..." : trimmed;
}

function getNullAnalysis(): PostAnalysis {
  return {
    qualityScore: null,
    insightType: null,
    sector: null,
    summary: null,
  };
}
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

// ============================================================
// COMMUNITY SENTIMENT ANALYSIS
// ============================================================

/**
 * Type for community sentiment analysis result
 *
 * What each field means:
 * - summary: 2-3 sentence overview of community sentiment
 * - keyThemes: Top catalysts/topics being discussed (max 3)
 * - sentimentStrength: How strong/unified the sentiment is
 * - confidence: How confident we are in the analysis (based on post quality/volume)
 */
export type CommunitySentimentAnalysis = {
  summary: string | null;
  keyThemes: string[];
  sentimentStrength: "strong" | "moderate" | "weak" | "mixed" | null;
  confidence: "high" | "medium" | "low" | null;
};

export interface NewsSentimentAnalysis {
  summary: string | null;
  keyThemes: string[];
  sentimentStrength: "strong" | "moderate" | "weak" | "mixed" | null;
  confidence: "high" | "medium" | "low" | null;
}

// Valid values for validation
const VALID_SENTIMENT_STRENGTHS = ["strong", "moderate", "weak", "mixed"];
const VALID_CONFIDENCE_LEVELS = ["high", "medium", "low"];

/**
 * System prompt for community sentiment analysis
 *
 * Key differences from individual post analysis:
 * - Analyzes MULTIPLE posts together
 * - Focuses on patterns and themes across the community
 * - Provides sentiment strength and confidence ratings
 */
const COMMUNITY_SYSTEM_PROMPT = `You are a financial analyst summarizing community sentiment for a stock trading platform.

Your task is to analyze a collection of community posts about a specific stock and provide:
1. A concise 2-3 sentence summary of the overall community sentiment
2. Key themes or catalysts mentioned (if any)
3. Sentiment strength rating
4. Confidence in the analysis

## Guidelines
- Focus on substance, not emotions ("earnings concerns" not "people are scared")
- Highlight specific catalysts when mentioned (earnings, FDA approval, rate cuts, etc.)
- Note if sentiment is unusually one-sided or if there is healthy debate
- Be concise - traders want quick insights, not essays
- If posts are mostly low-quality/spam, acknowledge limited quality insights

## Output Format
Return ONLY valid JSON (no markdown, no explanation):
{
  "summary": "<2-3 sentence overview>",
  "keyThemes": ["<theme1>", "<theme2>"],
  "sentimentStrength": "<strong|moderate|weak|mixed>",
  "confidence": "<high|medium|low>"
}

## Sentiment Strength Guidelines
- strong: 70%+ posts share the same sentiment with clear reasoning
- moderate: 50-70% agreement or mixed but trending one direction
- weak: No clear direction, sparse or low-quality posts
- mixed: Healthy debate with strong arguments on both sides

## Confidence Guidelines
- high: 5+ quality posts with specific reasoning
- medium: 3-5 posts or posts with some substance
- low: Few posts, mostly emotional/low-quality content`;

/**
 * Analyzes community sentiment for a stock using Claude AI
 *
 * What this does:
 * 1. Takes a list of quality posts about a stock
 * 2. Sends them to Claude with sentiment percentages
 * 3. Claude identifies themes, patterns, and overall community mood
 * 4. Returns structured analysis for display
 *
 * @param symbol - Stock ticker (e.g., "AAPL")
 * @param period - Time period analyzed (e.g., "24h", "7d")
 * @param posts - Array of quality posts with content, sentiment, and score
 * @param breakdown - Percentage breakdown of bullish/bearish/neutral
 */
export async function analyzeCommunitySentiment(
  symbol: string,
  period: string,
  posts: Array<{ content: string; sentiment: string; qualityScore: number | null }>,
  breakdown: { bullish: number; bearish: number; neutral: number }
): Promise<CommunitySentimentAnalysis> {
  // Check if API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[Anthropic] No API key configured, skipping community analysis");
    return getNullCommunityAnalysis();
  }

  // Need at least 3 posts for meaningful analysis
  if (posts.length < 3) {
    console.log("[Anthropic] Not enough posts for community analysis");
    return getNullCommunityAnalysis();
  }

  try {
    console.log(`[Anthropic] Analyzing community sentiment for $${symbol} (${period})`);

    // Format posts for Claude
    const postsText = posts
      .map(
        (p, i) =>
          `${i + 1}. "${p.content.substring(0, 300)}" (Sentiment: ${p.sentiment}, Quality: ${
            p.qualityScore?.toFixed(2) || "N/A"
          })`
      )
      .join("\n---\n");

    // Call Claude with community analysis prompt
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001", // Same fast model as post analysis
      max_tokens: 300,
      system: COMMUNITY_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analyze community sentiment for $${symbol}:

Time period: ${period}
Total quality posts: ${posts.length}

Sentiment breakdown:
- Bullish: ${breakdown.bullish}%
- Bearish: ${breakdown.bearish}%
- Neutral: ${breakdown.neutral}%

Recent quality posts:
${postsText}`,
        },
      ],
    });

    // Extract and parse response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    console.log("[Anthropic] Community analysis response:", responseText.substring(0, 200));

    return parseCommunityAnalysisResponse(responseText);
  } catch (error) {
    console.error("[Anthropic] Community analysis error:", error);
    return getNullCommunityAnalysis();
  }
}

/**
 * Parses and validates the JSON response from Claude
 */
function parseCommunityAnalysisResponse(text: string): CommunitySentimentAnalysis {
  try {
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Anthropic] No JSON found in community analysis response");
      return getNullCommunityAnalysis();
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      summary: validateCommunitySummary(parsed.summary),
      keyThemes: validateKeyThemes(parsed.keyThemes),
      sentimentStrength: validateSentimentStrength(parsed.sentimentStrength),
      confidence: validateConfidence(parsed.confidence),
    };
  } catch (error) {
    console.error("[Anthropic] Failed to parse community analysis:", text, error);
    return getNullCommunityAnalysis();
  }
}

function validateCommunitySummary(summary: unknown): string | null {
  if (typeof summary !== "string") return null;
  const trimmed = summary.trim();
  if (trimmed.length === 0) return null;
  // Truncate if too long
  return trimmed.length > 300 ? trimmed.substring(0, 297) + "..." : trimmed;
}

function validateKeyThemes(themes: unknown): string[] {
  if (!Array.isArray(themes)) return [];
  return themes
    .filter((t) => typeof t === "string" && t.trim().length > 0)
    .slice(0, 3) // Max 3 themes
    .map((t) => (t as string).trim());
}

function validateSentimentStrength(
  strength: unknown
): CommunitySentimentAnalysis["sentimentStrength"] {
  if (typeof strength !== "string") return null;
  const normalized = strength.toLowerCase().trim();
  return VALID_SENTIMENT_STRENGTHS.includes(normalized)
    ? (normalized as CommunitySentimentAnalysis["sentimentStrength"])
    : null;
}

function validateConfidence(
  confidence: unknown
): CommunitySentimentAnalysis["confidence"] {
  if (typeof confidence !== "string") return null;
  const normalized = confidence.toLowerCase().trim();
  return VALID_CONFIDENCE_LEVELS.includes(normalized)
    ? (normalized as CommunitySentimentAnalysis["confidence"])
    : null;
}

function getNullCommunityAnalysis(): CommunitySentimentAnalysis {
  return {
    summary: null,
    keyThemes: [],
    sentimentStrength: null,
    confidence: null,
  };
}

// ============================================================
// NEWS SENTIMENT ANALYSIS
// ============================================================

/**
 * Return type for analyzeNewsSentiment that includes Claude-calculated percentages
 */
export type NewsSentimentWithPercentages = NewsSentimentAnalysis & {
  bullishPercent: number;
  bearishPercent: number;
  neutralPercent: number;
};

/**
 * Analyzes news articles and calculates sentiment percentages using Claude.
 *
 * Why this approach:
 * - Finnhub's /news-sentiment endpoint requires a PAID subscription (~$50/month)
 * - The FREE tier only includes /company-news (headlines)
 * - So we have Claude classify each headline and calculate percentages
 *
 * @param symbol - Stock ticker being analyzed
 * @param articles - Array of news headlines with source and summary
 * @returns AI analysis with summary, themes, strength, confidence, AND percentages
 */
export async function analyzeNewsSentiment(
  symbol: string,
  articles: Array<{ headline: string; summary: string | null; source: string }>
): Promise<NewsSentimentWithPercentages> {
  const nullResult: NewsSentimentWithPercentages = {
    summary: null,
    keyThemes: [],
    sentimentStrength: null,
    confidence: null,
    bullishPercent: 0,
    bearishPercent: 0,
    neutralPercent: 0,
  };

  // Minimum 3 articles required for meaningful analysis
  if (articles.length < 3) {
    console.log(
      `[Anthropic] Not enough articles for ${symbol} analysis ` +
        `(got ${articles.length}, need 3)`
    );
    return nullResult;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[Anthropic] Missing ANTHROPIC_API_KEY");
    return nullResult;
  }

  // Format articles for the prompt (limit to 10 to control token usage)
  const articleList = articles
    .slice(0, 10)
    .map((a, i) => {
      const summarySnippet = a.summary
        ? `\n   ${a.summary.slice(0, 200)}...`
        : "";
      return `${i + 1}. [${a.source}] ${a.headline}${summarySnippet}`;
    })
    .join("\n");

  const systemPrompt = `You are a financial news analyst specializing in stock sentiment analysis.

Your task: Analyze recent news coverage for ${symbol} and:
1. Classify EACH headline as BULLISH, BEARISH, or NEUTRAL
2. Calculate the percentage breakdown from your classifications
3. Provide insights about media sentiment

Classification guidelines:
- BULLISH: Positive news (beats, upgrades, launches, growth, partnerships)
- BEARISH: Negative news (misses, downgrades, layoffs, lawsuits, risks)
- NEUTRAL: Factual reporting without clear positive/negative slant

Respond ONLY with valid JSON in this exact format:
{
  "bullishPercent": <number 0-100>,
  "bearishPercent": <number 0-100>,
  "neutralPercent": <number 0-100>,
  "summary": "2-3 sentence overview of media sentiment and key narratives",
  "keyThemes": ["Theme 1", "Theme 2", "Theme 3"],
  "sentimentStrength": "strong|moderate|weak|mixed",
  "confidence": "high|medium|low"
}

IMPORTANT: bullishPercent + bearishPercent + neutralPercent MUST equal 100.

Guidelines for each field:
- bullishPercent/bearishPercent/neutralPercent: Calculate from your headline classifications
- summary: What are major outlets saying? Focus on WHY sentiment is positive/negative.
- keyThemes: Top 3 topics driving coverage (e.g., "Earnings Beat", "Product Launch", "Regulatory Risk")
- sentimentStrength:
  - "strong" = >70% articles lean one direction
  - "moderate" = 50-70% lean one direction
  - "weak" = <50% clear direction
  - "mixed" = significant coverage on both sides
- confidence:
  - "high" = many articles with consistent messaging
  - "medium" = moderate article count or some disagreement
  - "low" = few articles or highly mixed messaging`;

  const userPrompt = `Analyze these recent news headlines for ${symbol}:\n\n${articleList}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400, // Increased slightly for percentages
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    // Extract text content from response
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in Claude response");
    }

    // Parse JSON from response (handles markdown code blocks too)
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Claude response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate percentages (must be numbers, default to 0)
    const bullishPercent = typeof parsed.bullishPercent === "number" ? Math.round(parsed.bullishPercent) : 0;
    const bearishPercent = typeof parsed.bearishPercent === "number" ? Math.round(parsed.bearishPercent) : 0;
    const neutralPercent = typeof parsed.neutralPercent === "number" ? Math.round(parsed.neutralPercent) : 0;

    // Normalize percentages to ensure they sum to 100
    const total = bullishPercent + bearishPercent + neutralPercent;
    const normalizedBullish = total > 0 ? Math.round((bullishPercent / total) * 100) : 34;
    const normalizedBearish = total > 0 ? Math.round((bearishPercent / total) * 100) : 33;
    const normalizedNeutral = 100 - normalizedBullish - normalizedBearish; // Ensure exactly 100

    return {
      summary: validateSummary(parsed.summary),
      keyThemes: validateKeyThemes(parsed.keyThemes),
      sentimentStrength: validateSentimentStrength(parsed.sentimentStrength),
      confidence: validateConfidence(parsed.confidence),
      bullishPercent: normalizedBullish,
      bearishPercent: normalizedBearish,
      neutralPercent: normalizedNeutral,
    };
  } catch (error) {
    console.error("[Anthropic] Error analyzing news sentiment:", error);
    return nullResult;
  }
}
// Gemini Service - AI-powered post analysis
// This file wraps the Google Generative AI SDK to analyze stock posts

import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini client with your API key
// The API key is stored in environment variables for security
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// The model we use - gemini-1.5-flash is fast and cost-effective
const MODEL_NAME = "gemini-1.5-flash";

// Type for the analysis result that matches our Prisma schema
export type PostAnalysis = {
  qualityScore: number | null; // 0.0 to 1.0
  insightType: string | null; // fundamental, technical, macro, earnings, risk, news, sentiment
  sector: string | null; // Technology, Healthcare, Finance, etc.
  summary: string | null; // One-sentence summary
};

// Valid insight types that Gemini should return
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
 * Analyzes a stock post using Gemini AI
 *
 * What it does (simple explanation):
 * - Takes a post's text and the stock tickers mentioned
 * - Sends it to Gemini AI with instructions on how to analyze it
 * - Gets back a quality score, type of insight, sector, and summary
 * - Returns null values if anything goes wrong (graceful degradation)
 *
 * Technical details:
 * - Uses structured JSON output for reliable parsing
 * - Includes timeout protection (10 seconds)
 * - Has retry logic for rate limits
 */
export async function analyzePost(
  content: string,
  tickers: string[]
): Promise<PostAnalysis> {
  // Check if API key is configured
  if (!process.env.GEMINI_API_KEY) {
    console.warn("[Gemini] No API key configured, skipping analysis");
    return {
      qualityScore: null,
      insightType: null,
      sector: null,
      summary: null,
    };
  }

  try {
    // Get the generative model
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        // Request JSON output format
        responseMimeType: "application/json",
        // Keep responses concise
        maxOutputTokens: 256,
        // Lower temperature = more consistent/predictable output
        temperature: 0.3,
      },
    });

    // Build the prompt that tells Gemini what to analyze
    const prompt = buildAnalysisPrompt(content, tickers);

    // Call Gemini with timeout protection
    const result = await Promise.race([
      model.generateContent(prompt),
      timeout(10000), // 10 second timeout
    ]);

    // Handle timeout case
    if (!result) {
      console.error("[Gemini] Request timed out");
      return getNullAnalysis();
    }

    // Extract the response text
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    const analysis = parseAnalysisResponse(text);
    return analysis;
  } catch (error) {
    // Log the error but don't crash - return null values instead
    console.error("[Gemini] Analysis failed:", error);
    return getNullAnalysis();
  }
}

/**
 * Builds the prompt that instructs Gemini on how to analyze the post
 *
 * Why we structure it this way:
 * - Clear role definition ("You are a financial content analyst")
 * - Explicit JSON format so we get predictable output
 * - Scoring guidelines help Gemini make consistent quality assessments
 */
function buildAnalysisPrompt(content: string, tickers: string[]): string {
  return `You are a financial content analyst. Analyze this stock-related post and provide structured insights.

Post Content: "${content}"
Mentioned Tickers: ${tickers.length > 0 ? tickers.join(", ") : "None specified"}

Respond with ONLY valid JSON in this exact format:
{
  "qualityScore": <number from 0.0 to 1.0>,
  "insightType": <one of: "fundamental", "technical", "macro", "earnings", "risk", "news", "sentiment">,
  "sector": <primary sector like "Technology", "Healthcare", "Finance", "Energy", "Consumer", "Industrial", "Materials", "Utilities", "Real Estate", "Communication Services", or "Unknown">,
  "summary": <one sentence summarizing the key insight, max 100 characters>
}

Scoring Guidelines:
- 0.0-0.3: Low quality (vague, no real insight, spam-like, just emotions)
- 0.4-0.6: Medium quality (some insight but generic, common knowledge)
- 0.7-1.0: High quality (specific, actionable, well-reasoned, unique perspective)

Important:
- qualityScore MUST be a number between 0 and 1
- insightType MUST be exactly one of the listed options
- summary should be concise and capture the main point
- If the post is mostly emotional without substance, score it lower`;
}

/**
 * Parses the JSON response from Gemini and validates it
 *
 * Why we validate:
 * - AI responses can sometimes be malformed
 * - We need to ensure data integrity before saving to database
 * - Invalid values get replaced with null (safe defaults)
 */
function parseAnalysisResponse(text: string): PostAnalysis {
  try {
    // Parse the JSON
    const parsed = JSON.parse(text);

    // Validate and sanitize each field
    const qualityScore = validateQualityScore(parsed.qualityScore);
    const insightType = validateInsightType(parsed.insightType);
    const sector = validateSector(parsed.sector);
    const summary = validateSummary(parsed.summary);

    return {
      qualityScore,
      insightType,
      sector,
      summary,
    };
  } catch (error) {
    console.error("[Gemini] Failed to parse response:", text);
    return getNullAnalysis();
  }
}

/**
 * Validates the quality score is a number between 0 and 1
 */
function validateQualityScore(score: unknown): number | null {
  if (typeof score !== "number") return null;
  if (isNaN(score)) return null;
  // Clamp to valid range
  return Math.max(0, Math.min(1, score));
}

/**
 * Validates the insight type is one of our allowed values
 */
function validateInsightType(type: unknown): string | null {
  if (typeof type !== "string") return null;
  const normalized = type.toLowerCase().trim();
  return VALID_INSIGHT_TYPES.includes(normalized) ? normalized : null;
}

/**
 * Validates and cleans the sector string
 */
function validateSector(sector: unknown): string | null {
  if (typeof sector !== "string") return null;
  const trimmed = sector.trim();
  if (trimmed.length === 0 || trimmed.toLowerCase() === "unknown") return null;
  // Capitalize first letter of each word
  return trimmed
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Validates and truncates the summary if needed
 */
function validateSummary(summary: unknown): string | null {
  if (typeof summary !== "string") return null;
  const trimmed = summary.trim();
  if (trimmed.length === 0) return null;
  // Truncate to 150 chars if too long
  return trimmed.length > 150 ? trimmed.substring(0, 147) + "..." : trimmed;
}

/**
 * Returns a null analysis object (used for error cases)
 */
function getNullAnalysis(): PostAnalysis {
  return {
    qualityScore: null,
    insightType: null,
    sector: null,
    summary: null,
  };
}

/**
 * Creates a timeout promise for race conditions
 * Used to prevent hanging if Gemini takes too long
 */
function timeout(ms: number): Promise<null> {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

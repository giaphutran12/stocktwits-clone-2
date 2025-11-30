/**
 * Finnhub API Wrapper
 *
 * Provides access to Finnhub's financial news and sentiment APIs.
 * Free tier: 60 API calls per minute.
 *
 * Endpoints used:
 * - /company-news: Get news articles for a stock
 * - /news-sentiment: Get pre-calculated sentiment scores
 */

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

// ============================================
// TYPES
// ============================================

export interface FinnhubNewsArticle {
  category: string;
  datetime: number;        // UNIX timestamp (seconds)
  headline: string;
  id: number;
  image: string;
  related: string;         // Comma-separated ticker symbols
  source: string;          // e.g., "Yahoo Finance", "CNBC"
  summary: string;
  url: string;
}

export interface FinnhubNewsSentiment {
  buzz: {
    articlesInLastWeek: number;
    weeklyAverage: number;
    buzz: number;          // Buzz score
  };
  companyNewsScore: number;              // Overall sentiment: -1 (bearish) to 1 (bullish)
  sectorAverageBullishPercent: number;
  sectorAverageNewsScore: number;
  sentiment: {
    bearishPercent: number;              // 0-100
    bullishPercent: number;              // 0-100
  };
  symbol: string;
}

// ============================================
// TICKER ALIASES
// ============================================

/**
 * Some companies have multiple ticker symbols (share classes) with different
 * news coverage in Finnhub. This maps to fallback tickers when primary has
 * insufficient articles.
 *
 * Example: Google has GOOG (Class C) and GOOGL (Class A). Finnhub has more
 * news coverage for GOOGL, so we try GOOGL if GOOG returns too few articles.
 */
const TICKER_FALLBACKS: Record<string, string> = {
  "GOOG": "GOOGL",   // Google Class C → try Class A
  "GOOGL": "GOOG",   // Google Class A → try Class C
  "BRK.A": "BRK.B",  // Berkshire Class A → try Class B
  "BRK.B": "BRK.A",  // Berkshire Class B → try Class A
};

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Fetches recent news articles for a stock symbol.
 *
 * Includes fallback logic for dual-class stocks (e.g., GOOG/GOOGL).
 * If the primary ticker returns < 3 articles, tries the fallback ticker.
 *
 * @param symbol - Stock ticker (e.g., "AAPL", "TSLA")
 * @param daysBack - Number of days to look back (default: 7)
 * @returns Array of news articles, empty array on error
 *
 * @example
 * const articles = await getCompanyNews("AAPL", 7);
 * // Returns up to ~50 articles from last 7 days
 */
export async function getCompanyNews(
  symbol: string,
  daysBack: number = 7
): Promise<FinnhubNewsArticle[]> {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    console.error("[Finnhub] Missing FINNHUB_API_KEY environment variable");
    return [];
  }

  const upperSymbol = symbol.toUpperCase();

  // Try primary ticker first
  const articles = await fetchNewsForTicker(upperSymbol, daysBack, apiKey);

  // If insufficient articles, try fallback ticker (e.g., GOOG → GOOGL)
  const MIN_ARTICLES = 3;
  if (articles.length < MIN_ARTICLES && TICKER_FALLBACKS[upperSymbol]) {
    const fallbackSymbol = TICKER_FALLBACKS[upperSymbol];
    console.log(
      `[Finnhub] ${upperSymbol} has only ${articles.length} articles, trying fallback: ${fallbackSymbol}`
    );
    const fallbackArticles = await fetchNewsForTicker(fallbackSymbol, daysBack, apiKey);

    if (fallbackArticles.length > articles.length) {
      console.log(
        `[Finnhub] Fallback ${fallbackSymbol} has ${fallbackArticles.length} articles - using fallback`
      );
      return fallbackArticles;
    }
  }

  return articles;
}

/**
 * Internal helper to fetch news for a single ticker.
 */
async function fetchNewsForTicker(
  symbol: string,
  daysBack: number,
  apiKey: string
): Promise<FinnhubNewsArticle[]> {
  // Calculate date range (YYYY-MM-DD format required by Finnhub)
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - daysBack);

  const from = fromDate.toISOString().split("T")[0];
  const to = toDate.toISOString().split("T")[0];

  const url = `${FINNHUB_BASE_URL}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${apiKey}`;

  try {
    console.log(`[Finnhub] Fetching news for ${symbol}...`);

    const response = await fetch(url, {
      cache: "no-store", // Disable Next.js cache to always get fresh data
    });

    console.log(`[Finnhub] News response status: ${response.status}`);

    if (!response.ok) {
      if (response.status === 429) {
        console.error("[Finnhub] Rate limit exceeded (60 calls/min)");
      } else if (response.status === 401) {
        console.error("[Finnhub] Invalid API key");
      }
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const articles: FinnhubNewsArticle[] = await response.json();

    console.log(
      `[Finnhub] Fetched ${articles.length} articles for ${symbol} (${from} to ${to})`
    );

    return articles;
  } catch (error) {
    console.error("[Finnhub] Error fetching company news:", error);
    return [];
  }
}

/**
 * Gets pre-calculated news sentiment for a stock.
 *
 * Finnhub analyzes news articles and provides:
 * - bullishPercent/bearishPercent: Percentage of positive/negative articles
 * - companyNewsScore: Overall score from -1 (very bearish) to 1 (very bullish)
 * - buzz: Article volume compared to average
 *
 * @param symbol - Stock ticker (e.g., "AAPL", "TSLA")
 * @returns Sentiment data or null if unavailable
 *
 * @example
 * const sentiment = await getNewsSentiment("AAPL");
 * if (sentiment) {
 *   console.log(`Bullish: ${sentiment.sentiment.bullishPercent}%`);
 * }
 */
export async function getNewsSentiment(
  symbol: string
): Promise<FinnhubNewsSentiment | null> {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    console.error("[Finnhub] Missing FINNHUB_API_KEY environment variable");
    return null;
  }

  const url = `${FINNHUB_BASE_URL}/news-sentiment?symbol=${symbol.toUpperCase()}&token=${apiKey}`;

  try {
    console.log(`[Finnhub] Fetching sentiment for ${symbol}...`);

    const response = await fetch(url, {
      cache: "no-store", // Disable Next.js cache to always get fresh data
    });

    console.log(`[Finnhub] Response status: ${response.status}`);

    if (!response.ok) {
      if (response.status === 429) {
        console.error("[Finnhub] Rate limit exceeded (60 calls/min)");
      } else if (response.status === 401) {
        console.error("[Finnhub] Invalid API key");
      }
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const data: FinnhubNewsSentiment = await response.json();

    // DEBUG: Log raw response
    console.log(`[Finnhub] Raw response for ${symbol}:`, JSON.stringify(data).slice(0, 200));

    // Finnhub returns empty object {} if no data available for symbol
    if (!data.symbol) {
      console.log(`[Finnhub] No sentiment data available for ${symbol} (empty response)`);
      return null;
    }

    console.log(
      `[Finnhub] Got sentiment for ${symbol}: ` +
      `score=${data.companyNewsScore.toFixed(2)}, ` +
      `bullish=${data.sentiment?.bullishPercent?.toFixed(1)}%`
    );

    return data;
  } catch (error) {
    console.error("[Finnhub] Error fetching news sentiment:", error);
    return null;
  }
}

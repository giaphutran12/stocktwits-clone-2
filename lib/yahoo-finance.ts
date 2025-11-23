// Yahoo Finance Wrapper
// This file is like a "translator" between our app and Yahoo Finance.
// Instead of calling Yahoo Finance directly everywhere, we use these helper
// functions. This makes our code cleaner and easier to change later.

// Note: yahoo-finance2 v3.x requires instantiation (breaking change from v2)
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Types for our stock data (TypeScript helps catch errors before runtime)
export interface StockQuote {
  symbol: string;
  shortName: string;
  longName: string | null;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  marketCap: number | null;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  averageVolume: number;
}

export interface HistoricalDataPoint {
  date: string; // ISO date string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TimeRange = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "5y";

// Maps our friendly range names to Yahoo Finance intervals
// Interval = how often to sample data (1 minute, 1 day, etc.)
const rangeToInterval: Record<TimeRange, string> = {
  "1d": "5m",    // 1 day: every 5 minutes
  "5d": "15m",   // 5 days: every 15 minutes
  "1mo": "1d",   // 1 month: daily
  "3mo": "1d",   // 3 months: daily
  "6mo": "1d",   // 6 months: daily
  "1y": "1wk",   // 1 year: weekly
  "5y": "1mo",   // 5 years: monthly
};

/**
 * Get current stock quote (price, change, volume, etc.)
 *
 * Think of this like checking the current price tag on a stock.
 */
export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    // yahooFinance.quote returns a complex union type, so we use 'any' here
    // and validate the data ourselves. This is a pragmatic choice when
    // dealing with external APIs that have complex/changing types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());

    if (!quote || !quote.symbol) return null;

    return {
      symbol: quote.symbol,
      shortName: quote.shortName || quote.symbol,
      longName: quote.longName || null,
      regularMarketPrice: quote.regularMarketPrice || 0,
      regularMarketChange: quote.regularMarketChange || 0,
      regularMarketChangePercent: quote.regularMarketChangePercent || 0,
      regularMarketVolume: quote.regularMarketVolume || 0,
      marketCap: quote.marketCap || null,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
      averageVolume: quote.averageDailyVolume3Month || 0,
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

/**
 * Get historical price data for charting
 *
 * This returns an array of price points over time - perfect for drawing charts.
 * Each point has: date, open, high, low, close, volume (OHLCV data)
 */
export async function getHistoricalData(
  symbol: string,
  range: TimeRange = "1mo"
): Promise<HistoricalDataPoint[]> {
  try {
    const interval = rangeToInterval[range];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.chart(symbol.toUpperCase(), {
      period1: getStartDate(range),
      interval: interval as "1d" | "1wk" | "1mo" | "5m" | "15m",
    });

    if (!result?.quotes) return [];

    // Transform Yahoo's format into our cleaner format
    return result.quotes
      .filter((q: any) => q.close !== null) // Remove any bad data points
      .map((q: any) => ({
        date: q.date.toISOString(),
        open: q.open || 0,
        high: q.high || 0,
        low: q.low || 0,
        close: q.close || 0,
        volume: q.volume || 0,
      }));
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return [];
  }
}

/**
 * Search for stocks by name or symbol
 *
 * When a user types "Apple" or "AAPL", this finds matching stocks.
 */
export async function searchStocks(query: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any = await yahooFinance.search(query, {
      newsCount: 0,
      quotesCount: 10,
    });

    if (!results?.quotes) return [];

    return results.quotes
      .filter((q: any) => q.quoteType === "EQUITY") // Only stocks, not ETFs/crypto
      .map((q: any) => ({
        symbol: q.symbol,
        shortName: q.shortname || q.symbol,
        exchange: q.exchange,
      }));
  } catch (error) {
    console.error(`Error searching for ${query}:`, error);
    return [];
  }
}

// Helper: Calculate start date based on range
function getStartDate(range: TimeRange): Date {
  const now = new Date();
  switch (range) {
    case "1d":
      return new Date(now.setDate(now.getDate() - 1));
    case "5d":
      return new Date(now.setDate(now.getDate() - 5));
    case "1mo":
      return new Date(now.setMonth(now.getMonth() - 1));
    case "3mo":
      return new Date(now.setMonth(now.getMonth() - 3));
    case "6mo":
      return new Date(now.setMonth(now.getMonth() - 6));
    case "1y":
      return new Date(now.setFullYear(now.getFullYear() - 1));
    case "5y":
      return new Date(now.setFullYear(now.getFullYear() - 5));
    default:
      return new Date(now.setMonth(now.getMonth() - 1));
  }
}

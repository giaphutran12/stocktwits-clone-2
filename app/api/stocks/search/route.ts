/**
 * API Route: GET /api/stocks/search?q=query
 *
 * Searches for stocks by name or ticker symbol using Yahoo Finance.
 * Returns an array of matching stocks with symbol, name, and exchange.
 *
 * Example: /api/stocks/search?q=apple → [{ symbol: "AAPL", shortName: "Apple Inc.", exchange: "NASDAQ" }]
 */

import { NextRequest, NextResponse } from "next/server";
import { searchStocks } from "@/lib/yahoo-finance";

// Force Node.js runtime (required for yahoo-finance2 package)
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // Get the search query from URL params
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    // Require at least 1 character to search
    if (!query || query.trim().length < 1) {
      return NextResponse.json([]);
    }

    // Call the existing searchStocks function from yahoo-finance lib
    const results = await searchStocks(query.trim());

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error in stock search API:", error);
    return NextResponse.json(
      { error: "Failed to search stocks" },
      { status: 500 }
    );
  }
}

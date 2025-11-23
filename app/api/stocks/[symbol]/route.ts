// API Route: GET /api/stocks/[symbol]
// This is a "server-side endpoint" - code that runs on the server, not in the browser.
// When someone visits /api/stocks/AAPL, this code runs and returns stock data as JSON.

import { NextRequest, NextResponse } from "next/server";
import { getStockQuote } from "@/lib/yahoo-finance";

// The { params } object contains URL parameters - in this case, the stock symbol
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol is required" },
        { status: 400 } // 400 = "Bad Request" - user did something wrong
      );
    }

    const quote = await getStockQuote(symbol);

    if (!quote) {
      return NextResponse.json(
        { error: `Stock not found: ${symbol}` },
        { status: 404 } // 404 = "Not Found"
      );
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Error in stock quote API:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock data" },
      { status: 500 } // 500 = "Server Error" - something broke on our end
    );
  }
}

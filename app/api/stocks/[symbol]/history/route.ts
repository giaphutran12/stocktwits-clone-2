// API Route: GET /api/stocks/[symbol]/history?range=1mo
// Returns historical price data for charting.
// The "range" query parameter lets users choose how far back to look.

import { NextRequest, NextResponse } from "next/server";
import { getHistoricalData, TimeRange } from "@/lib/yahoo-finance";

// Force Node.js runtime (required for yahoo-finance2 package)
export const runtime = "nodejs";

const validRanges: TimeRange[] = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "5y"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;

    // Get "range" from URL query string (e.g., ?range=1mo)
    const searchParams = request.nextUrl.searchParams;
    const range = (searchParams.get("range") || "1mo") as TimeRange;

    // Validate the range parameter
    if (!validRanges.includes(range)) {
      return NextResponse.json(
        { error: `Invalid range. Use one of: ${validRanges.join(", ")}` },
        { status: 400 }
      );
    }

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol is required" },
        { status: 400 }
      );
    }

    const data = await getHistoricalData(symbol, range);

    if (data.length === 0) {
      return NextResponse.json(
        { error: `No historical data found for ${symbol}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      range,
      data,
    });
  } catch (error) {
    console.error("Error in stock history API:", error);
    return NextResponse.json(
      { error: "Failed to fetch historical data" },
      { status: 500 }
    );
  }
}

// Stock Page: /stock/[symbol]
// This is a dynamic route - the [symbol] folder name means Next.js will
// capture whatever comes after /stock/ and pass it as a parameter.
// Example: /stock/AAPL -> symbol = "AAPL"

import { StockChart } from "@/components/stock/stock-chart";
import { StockStats } from "@/components/stock/stock-stats";

// This is a Server Component by default. The params come from the URL.
export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  return (
    <main className="max-w-4xl mx-auto p-4">
      {/* Stock stats section */}
      <section className="mb-8">
        <StockStats symbol={upperSymbol} />
      </section>

      {/* Chart section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Price Chart</h2>
        <div className="bg-white border rounded-lg p-4">
          <StockChart symbol={upperSymbol} />
        </div>
      </section>

      {/* Placeholder for community posts (Phase 3) */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          Community Posts about ${upperSymbol}
        </h2>
        <div className="bg-gray-50 border border-dashed rounded-lg p-8 text-center text-gray-500">
          Posts will appear here once we build the post system (Phase 3)
        </div>
      </section>
    </main>
  );
}

// Generate metadata (page title) dynamically based on the stock symbol
export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  return {
    title: `${symbol.toUpperCase()} Stock - StockTwits Clone`,
    description: `View ${symbol.toUpperCase()} stock price, chart, and community posts`,
  };
}

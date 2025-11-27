// Stock Page: /stock/[symbol]
// This is a dynamic route - the [symbol] folder name means Next.js will
// capture whatever comes after /stock/ and pass it as a parameter.
// Example: /stock/AAPL -> symbol = "AAPL"

// This is now a Server Component (no "use client" directive)
// Server Components can use generateMetadata but cannot use hooks
// All client-side logic has been moved to StockPostsSection

import { StockChart } from "@/components/stock/stock-chart";
import { StockStats } from "@/components/stock/stock-stats";
import { StockPostsSection } from "@/components/stock/stock-posts-section";
import { CommunitySentiment } from "@/components/stock/community-sentiment";

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  // In Server Components, we await the params promise
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  return (
    <main className="max-w-4xl mx-auto p-4">
      {/* Stock stats section */}
      <section className="mb-8">
        <StockStats symbol={upperSymbol} />
      </section>

      {/* Community sentiment analysis section */}
      <section className="mb-8">
        <CommunitySentiment symbol={upperSymbol} />
      </section>

      {/* Chart section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Price Chart</h2>
        <div className="bg-white border rounded-lg p-4">
          <StockChart symbol={upperSymbol} />
        </div>
      </section>

      {/* Community posts section - delegated to a Client Component */}
      <StockPostsSection symbol={upperSymbol} />
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

"use client";

/**
 * StockSearch Component - Autocomplete search for stocks
 *
 * How it works:
 * 1. User types in the search input (e.g., "apple" or "AAPL")
 * 2. After 300ms of no typing (debounce), we call the search API
 * 3. Results appear in a dropdown showing $SYMBOL and company name
 * 4. User can navigate with arrow keys or click to select
 * 5. Selecting navigates to /stock/[symbol]
 *
 * Desktop: Shows full search input in the navbar
 * Mobile: Shows search icon that opens a dialog
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandDialog,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Type for search results from our API
type StockResult = {
  symbol: string;
  shortName: string;
  exchange: string;
};

export function StockSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Ref to track if component is mounted (prevent state updates after unmount)
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Debounced search effect
  // This waits 300ms after user stops typing before making API call
  useEffect(() => {
    // Don't search if query is too short
    if (query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Set up debounce timer
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(query)}`
        );
        const data = await response.json();

        // Only update state if component is still mounted
        if (isMounted.current) {
          setResults(data);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Search error:", error);
        if (isMounted.current) {
          setResults([]);
          setIsLoading(false);
        }
      }
    }, 300);

    // Cleanup: cancel the timer if user types again before 300ms
    return () => clearTimeout(timer);
  }, [query]);

  // Handle selecting a stock from results
  const handleSelect = useCallback(
    (symbol: string) => {
      // Navigate to the stock page
      router.push(`/stock/${symbol}`);
      // Reset state
      setQuery("");
      setResults([]);
      setOpen(false);
      setMobileOpen(false);
    },
    [router]
  );

  // Shared Command content (used in both desktop popover and mobile dialog)
  const SearchContent = (
    <>
      <CommandInput
        placeholder="Search stocks... (e.g., AAPL, Tesla)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {/* Loading state */}
        {isLoading && query.length >= 2 && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Searching...
            </span>
          </div>
        )}

        {/* Empty state - only show when not loading and query is long enough */}
        {!isLoading && query.length >= 2 && results.length === 0 && (
          <CommandEmpty>
            No stocks found for &quot;{query}&quot;
          </CommandEmpty>
        )}

        {/* Results */}
        {!isLoading && results.length > 0 && (
          <CommandGroup heading="Stocks">
            {results.map((stock) => (
              <CommandItem
                key={stock.symbol}
                value={`${stock.symbol} ${stock.shortName}`}
                onSelect={() => handleSelect(stock.symbol)}
                className="cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-blue-600">
                    ${stock.symbol}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {stock.shortName}
                  </span>
                </div>
                <span className="ml-auto text-xs text-muted-foreground">
                  {stock.exchange}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Help text when no query */}
        {query.length < 2 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Type at least 2 characters to search
          </div>
        )}
      </CommandList>
    </>
  );

  return (
    <>
      {/* Desktop: Popover with search input */}
      <div className="hidden md:block">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 border rounded-md hover:bg-muted/80 transition-colors w-64"
              onClick={() => setOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span>Search stocks...</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command shouldFilter={false}>{SearchContent}</Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Mobile: Search icon button that opens dialog */}
      <div className="md:hidden">
        <button
          className="p-2 hover:bg-muted rounded-md transition-colors"
          onClick={() => setMobileOpen(true)}
          aria-label="Search stocks"
        >
          <Search className="h-5 w-5" />
        </button>

        <CommandDialog
          open={mobileOpen}
          onOpenChange={setMobileOpen}
          title="Search Stocks"
          description="Search for stocks by name or ticker symbol"
        >
          {SearchContent}
        </CommandDialog>
      </div>
    </>
  );
}

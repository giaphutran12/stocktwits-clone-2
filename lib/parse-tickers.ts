/**
 * Utility functions for parsing and handling $TICKER symbols in text.
 * Used throughout the StockTwits Clone for identifying stock mentions in posts.
 */

/**
 * Regular expression pattern for matching $TICKER symbols.
 * Matches $ followed by 1-5 letters (case-insensitive).
 * The 'g' flag finds all matches, 'i' flag makes it case-insensitive.
 */
const TICKER_REGEX = /\$([A-Za-z]{1,5})\b/gi;

/**
 * Extracts unique $TICKER symbols from text.
 *
 * @param text - The input text to parse for ticker symbols
 * @returns An array of unique ticker symbols (uppercase, without $ prefix)
 *
 * @example
 * parseTickers("I love $AAPL and $tsla! $AAPL is great")
 * // Returns: ["AAPL", "TSLA"]
 *
 * @example
 * parseTickers("No tickers here")
 * // Returns: []
 */
export function parseTickers(text: string): string[] {
  // Reset regex lastIndex to ensure we start from the beginning
  // (important because we're using a global regex)
  TICKER_REGEX.lastIndex = 0;

  const matches: string[] = [];
  let match: RegExpExecArray | null;

  // Use exec() in a loop to get all matches with their captured groups
  while ((match = TICKER_REGEX.exec(text)) !== null) {
    // match[1] is the captured group (the ticker without $)
    const ticker = match[1].toUpperCase();

    // Only add if not already in the array (ensures uniqueness)
    if (!matches.includes(ticker)) {
      matches.push(ticker);
    }
  }

  return matches;
}

/**
 * Returns text with $TICKER symbols wrapped in a marker format for highlighting.
 * The markers can be used later to render highlighted tickers in React.
 *
 * @param text - The input text containing ticker symbols
 * @returns The text with tickers wrapped in [[TICKER:SYMBOL]] format
 *
 * @example
 * highlightTickers("I love $AAPL!")
 * // Returns: "I love [[TICKER:AAPL]]!"
 *
 * @example
 * highlightTickers("Buy $tsla now")
 * // Returns: "Buy [[TICKER:TSLA]] now"
 */
export function highlightTickers(text: string): string {
  // Reset regex lastIndex before using
  TICKER_REGEX.lastIndex = 0;

  // Replace each $TICKER with a marked-up version
  // The callback receives the full match and the captured group
  return text.replace(TICKER_REGEX, (_fullMatch, ticker: string) => {
    return `[[TICKER:${ticker.toUpperCase()}]]`;
  });
}

/**
 * Validates if a string is a valid ticker format.
 * Valid tickers are 1-5 uppercase letters only (no $ prefix).
 *
 * @param ticker - The ticker string to validate (without $ prefix)
 * @returns True if the ticker format is valid, false otherwise
 *
 * @example
 * isValidTicker("AAPL")  // Returns: true
 * isValidTicker("TSLA")  // Returns: true
 * isValidTicker("A")     // Returns: true (1 letter is valid)
 * isValidTicker("TOOLONG") // Returns: false (more than 5 letters)
 * isValidTicker("aapl")  // Returns: false (must be uppercase)
 * isValidTicker("AA1")   // Returns: false (no numbers allowed)
 * isValidTicker("")      // Returns: false (empty string)
 */
export function isValidTicker(ticker: string): boolean {
  // Pattern: exactly 1-5 uppercase letters, nothing else
  // ^ = start of string, $ = end of string
  const VALID_TICKER_REGEX = /^[A-Z]{1,5}$/;

  return VALID_TICKER_REGEX.test(ticker);
}

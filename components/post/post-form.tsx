"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseTickers } from "@/lib/parse-tickers";

// Sentiment type matches Prisma enum
type Sentiment = "BULLISH" | "BEARISH" | "NEUTRAL";

interface PostFormProps {
  onPostCreated?: () => void;
}

/**
 * PostForm Component
 *
 * A form for creating new posts with sentiment selection and ticker detection.
 * Users can write posts mentioning stocks using $TICKER format (e.g., $AAPL).
 * The component shows detected tickers as the user types.
 *
 * Features:
 * - Textarea for post content
 * - Sentiment selector (Bullish/Bearish/Neutral)
 * - Real-time ticker detection preview
 * - Auth check (shows sign-in prompt if not logged in)
 * - Loading state during submission
 */
export function PostForm({ onPostCreated }: PostFormProps) {
  // Get current user from Clerk
  const { isLoaded, isSignedIn, user } = useUser();

  // Form state
  const [content, setContent] = useState("");
  const [sentiment, setSentiment] = useState<Sentiment>("NEUTRAL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse tickers from content as user types
  const detectedTickers = parseTickers(content);

  // Character limit
  const MAX_CHARS = 500;
  const remainingChars = MAX_CHARS - content.length;
  const isOverLimit = remainingChars < 0;

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!content.trim()) {
      setError("Post content cannot be empty");
      return;
    }

    if (isOverLimit) {
      setError("Post exceeds character limit");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content.trim(),
          sentiment,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create post");
      }

      // Clear form on success
      setContent("");
      setSentiment("NEUTRAL");

      // Call callback to notify parent (e.g., to refresh feed)
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading skeleton while Clerk loads
  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-muted rounded-md" />
            <div className="h-9 bg-muted rounded-md w-1/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show sign-in prompt if user is not logged in
  if (!isSignedIn) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Sign in to create posts
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Post content textarea */}
          <div className="space-y-2">
            <Textarea
              placeholder="What&apos;s happening in the market? Use $TICKER to mention stocks..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[100px] resize-none"
            />

            {/* Character count */}
            <div className="flex justify-end">
              <span
                className={`text-sm ${
                  isOverLimit
                    ? "text-destructive font-semibold"
                    : remainingChars < 50
                    ? "text-yellow-600"
                    : "text-muted-foreground"
                }`}
              >
                {content.length}/{MAX_CHARS}
              </span>
            </div>
          </div>

          {/* Detected tickers */}
          {detectedTickers.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Detected:</span>
              {detectedTickers.map((ticker) => (
                <Badge key={ticker} variant="secondary">
                  ${ticker}
                </Badge>
              ))}
            </div>
          )}

          {/* Sentiment selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sentiment</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={sentiment === "BULLISH" ? "default" : "outline"}
                onClick={() => setSentiment("BULLISH")}
                disabled={isSubmitting}
                className={
                  sentiment === "BULLISH"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "hover:bg-green-50 hover:text-green-700 hover:border-green-600"
                }
              >
                🟢 Bullish
              </Button>
              <Button
                type="button"
                variant={sentiment === "BEARISH" ? "default" : "outline"}
                onClick={() => setSentiment("BEARISH")}
                disabled={isSubmitting}
                className={
                  sentiment === "BEARISH"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "hover:bg-red-50 hover:text-red-700 hover:border-red-600"
                }
              >
                🔴 Bearish
              </Button>
              <Button
                type="button"
                variant={sentiment === "NEUTRAL" ? "default" : "outline"}
                onClick={() => setSentiment("NEUTRAL")}
                disabled={isSubmitting}
                className={
                  sentiment === "NEUTRAL"
                    ? "bg-gray-600 hover:bg-gray-700 text-white"
                    : "hover:bg-gray-50 hover:text-gray-700 hover:border-gray-600"
                }
              >
                ⚪ Neutral
              </Button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !content.trim() || isOverLimit}
          >
            {isSubmitting ? "Posting..." : "Post"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

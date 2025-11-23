"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle } from "lucide-react";

// Post type matching Prisma schema + API response
type Post = {
  id: string;
  content: string;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  createdAt: string;
  author: {
    id: string;
    username: string | null;
    name: string | null;
    imageUrl: string | null;
  };
  tickers: { symbol: string }[];
  _count: {
    likes: number;
    comments: number;
  };
};

interface PostCardProps {
  post: Post;
}

/**
 * Converts a date string to a relative time string (e.g., "2h ago", "3d ago")
 * This is a simple implementation - in production you might use date-fns or dayjs
 */
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mo ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
}

/**
 * Returns sentiment badge configuration based on sentiment type
 */
function getSentimentConfig(sentiment: Post["sentiment"]) {
  switch (sentiment) {
    case "BULLISH":
      return {
        label: "Bullish",
        className: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20",
      };
    case "BEARISH":
      return {
        label: "Bearish",
        className: "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20",
      };
    case "NEUTRAL":
      return {
        label: "Neutral",
        className: "bg-gray-500/10 text-gray-600 border-gray-500/20 hover:bg-gray-500/20",
      };
  }
}

/**
 * Parses post content and converts $TICKER mentions into clickable links
 * Returns an array of React nodes (strings and Link components)
 */
function parseContentWithTickers(content: string): React.ReactNode[] {
  // Regex to match $TICKER format ($ followed by 1-5 uppercase letters)
  const tickerRegex = /(\$[A-Z]{1,5})/g;
  const parts = content.split(tickerRegex);

  return parts.map((part, index) => {
    // Check if this part is a ticker (starts with $)
    if (part.startsWith("$") && tickerRegex.test(part)) {
      const symbol = part.slice(1); // Remove the $ prefix
      return (
        <Link
          key={`${symbol}-${index}`}
          href={`/stock/${symbol}`}
          className="text-blue-500 font-semibold hover:text-blue-600 hover:underline"
        >
          {part}
        </Link>
      );
    }
    return part;
  });
}

/**
 * Gets the initials from a name for avatar fallback
 */
function getInitials(name: string | null, username: string | null): string {
  if (name) {
    const names = name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (username) {
    return username.slice(0, 2).toUpperCase();
  }
  return "??";
}

export function PostCard({ post }: PostCardProps) {
  const { author, content, sentiment, createdAt, _count } = post;
  const sentimentConfig = getSentimentConfig(sentiment);
  const displayName = author.name || author.username || "Anonymous";
  const displayUsername = author.username ? `@${author.username}` : "";

  return (
    <Card className="py-4">
      <CardContent className="space-y-3">
        {/* Author Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              {author.imageUrl && (
                <AvatarImage src={author.imageUrl} alt={displayName} />
              )}
              <AvatarFallback>
                {getInitials(author.name, author.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{displayName}</span>
                {displayUsername && (
                  <span className="text-muted-foreground text-sm">
                    {displayUsername}
                  </span>
                )}
              </div>
              <span className="text-muted-foreground text-xs">
                {getRelativeTime(createdAt)}
              </span>
            </div>
          </div>
          {/* Sentiment Badge */}
          <Badge variant="outline" className={sentimentConfig.className}>
            {sentimentConfig.label}
          </Badge>
        </div>

        {/* Post Content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {parseContentWithTickers(content)}
        </p>

        {/* Footer: Likes and Comments */}
        <div className="flex items-center gap-4 pt-2 text-muted-foreground">
          <div className="flex items-center gap-1.5 text-sm">
            <Heart className="size-4" />
            <span>{_count.likes}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <MessageCircle className="size-4" />
            <span>{_count.comments}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

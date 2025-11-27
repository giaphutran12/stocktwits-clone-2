"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Sparkles, Star, Loader2 } from "lucide-react";
import { CommentSection } from "./comment-section";
import { toast } from "sonner";

// Post type matching Prisma schema + API response
// Now includes AI analysis fields from Gemini
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
  // AI Analysis fields (populated async by Claude)
  qualityScore: number | null;
  insightType: string | null;
  sector: string | null;
  summary: string | null;
  // Like status for current user
  hasLiked: boolean;
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

/**
 * Renders quality score as stars (1-5 scale)
 * Converts 0-1 score to filled/empty stars
 *
 * Example: 0.8 score = 4 filled stars, 1 empty star
 */
function renderQualityStars(score: number | null): React.ReactNode {
  if (score === null) return null;

  // Convert 0-1 score to 1-5 stars
  const starCount = Math.round(score * 5);

  return (
    <div className="flex items-center gap-0.5" title={`Quality: ${Math.round(score * 100)}%`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`size-3.5 ${
            i <= starCount
              ? "fill-yellow-400 text-yellow-400"
              : "fill-none text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Returns styling for insight type badges
 * Each insight type has a distinct color for quick visual recognition
 */
function getInsightTypeConfig(type: string | null) {
  if (!type) return null;

  const configs: Record<string, { label: string; className: string }> = {
    fundamental: {
      label: "Fundamental",
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    technical: {
      label: "Technical",
      className: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    },
    macro: {
      label: "Macro",
      className: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    },
    earnings: {
      label: "Earnings",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    risk: {
      label: "Risk",
      className: "bg-red-500/10 text-red-600 border-red-500/20",
    },
    news: {
      label: "News",
      className: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    },
    sentiment: {
      label: "Sentiment",
      className: "bg-pink-500/10 text-pink-600 border-pink-500/20",
    },
  };

  return configs[type.toLowerCase()] || null;
}

export function PostCard({ post }: PostCardProps) {
  const { author, content, sentiment, createdAt, _count, qualityScore, insightType, sector, summary, hasLiked } = post;
  const { isSignedIn } = useUser();

  // Optimistic UI state for likes
  const [isLiked, setIsLiked] = useState(hasLiked);
  const [likeCount, setLikeCount] = useState(_count.likes);
  const [isLiking, setIsLiking] = useState(false);

  const sentimentConfig = getSentimentConfig(sentiment);
  const displayName = author.name || author.username || "Anonymous";
  const displayUsername = author.username ? `@${author.username}` : "";
  const insightConfig = getInsightTypeConfig(insightType);

  // Check if we have any AI analysis data to display
  const hasAIAnalysis = qualityScore !== null || insightType || sector || summary;

  /**
   * Handle like button click with optimistic UI
   * Updates the UI immediately, then syncs with server
   * Rolls back on error
   */
  const handleLike = async () => {
    // Check if user is signed in
    if (!isSignedIn) {
      toast.info("Sign in to like posts");
      return;
    }

    // Prevent double-clicks while request is in flight
    if (isLiking) return;

    // Optimistic update - change UI immediately
    const previousLiked = isLiked;
    const previousCount = likeCount;
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    setIsLiking(true);

    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to toggle like");
      }

      // Sync with server response (in case of race conditions)
      const data = await response.json();
      setIsLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch (error) {
      // Rollback on error
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      toast.error("Failed to like post. Please try again.");
      console.error("Like error:", error);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <Card className="py-4">
      <CardContent className="space-y-3">
        {/* Author Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar - clickable if user has username */}
            {author.username ? (
              <Link href={`/profile/${author.username}`}>
                <Avatar className="size-10 cursor-pointer hover:opacity-80 transition-opacity">
                  {author.imageUrl && (
                    <AvatarImage src={author.imageUrl} alt={displayName} />
                  )}
                  <AvatarFallback>
                    {getInitials(author.name, author.username)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Avatar className="size-10">
                {author.imageUrl && (
                  <AvatarImage src={author.imageUrl} alt={displayName} />
                )}
                <AvatarFallback>
                  {getInitials(author.name, author.username)}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                {author.username ? (
                  <Link
                    href={`/profile/${author.username}`}
                    className="font-semibold text-sm hover:underline"
                  >
                    {displayName}
                  </Link>
                ) : (
                  <span className="font-semibold text-sm">{displayName}</span>
                )}
                {displayUsername && (
                  <Link
                    href={`/profile/${author.username}`}
                    className="text-muted-foreground text-sm hover:underline"
                  >
                    {displayUsername}
                  </Link>
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

        {/* AI Analysis Section - Only shown if we have analysis data */}
        {hasAIAnalysis && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2 border border-border/50">
            {/* AI Header with quality stars */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-violet-500" />
                <span className="text-xs font-medium text-muted-foreground">AI Analysis</span>
              </div>
              {renderQualityStars(qualityScore)}
            </div>

            {/* Insight Type and Sector badges */}
            <div className="flex flex-wrap items-center gap-2">
              {insightConfig && (
                <Badge variant="outline" className={`text-xs ${insightConfig.className}`}>
                  {insightConfig.label}
                </Badge>
              )}
              {sector && (
                <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-600 border-gray-500/20">
                  {sector}
                </Badge>
              )}
            </div>

            {/* AI Summary */}
            {summary && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {summary}
              </p>
            )}
          </div>
        )}

        {/* Footer: Like Button */}
        <div className="flex items-center gap-4 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center gap-1.5 px-2 h-8 transition-all duration-200 ${
              isLiked
                ? "text-red-500 hover:text-red-600"
                : "text-muted-foreground hover:text-red-400"
            }`}
          >
            {isLiking ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Heart
                className={`size-4 transition-transform duration-200 ${
                  isLiked ? "fill-red-500 scale-110" : "fill-none"
                }`}
              />
            )}
            <span className="text-sm">{likeCount}</span>
          </Button>
        </div>

        {/* Comment Section - Expandable */}
        <CommentSection postId={post.id} commentCount={_count.comments} />
      </CardContent>
    </Card>
  );
}

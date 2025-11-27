"use client";

import { PostCard } from "./post-card";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Post type matching Prisma schema + API response
// Includes AI analysis fields from Claude
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

interface PostListProps {
  posts: Post[];
  isLoading?: boolean;
  error?: string | null;
}

export function PostList({ posts, isLoading, error }: PostListProps) {
  // Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading posts...</p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <Card className="border-red-500/20 bg-red-500/5">
        <CardContent className="py-8 text-center space-y-2">
          <p className="text-sm font-semibold text-red-600">
            Failed to load posts
          </p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Empty State
  if (posts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            No posts yet. Be the first to post!
          </p>
          <p className="text-xs text-muted-foreground">
            Share your thoughts about stocks and start the conversation.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Posts List
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

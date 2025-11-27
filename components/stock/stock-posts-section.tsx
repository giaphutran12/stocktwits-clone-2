// Stock Posts Section Component
// This is a Client Component that handles all the posts-related functionality
// for a specific stock ticker. It manages state, fetches posts, and displays
// the post form and post list.

"use client";

import { useState, useEffect } from "react";
import { PostForm } from "@/components/post/post-form";
import { PostList } from "@/components/post/post-list";

// Type definition for posts (matches what the API returns)
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

interface StockPostsSectionProps {
  symbol: string;
}

export function StockPostsSection({ symbol }: StockPostsSectionProps) {
  // State for posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch posts filtered by ticker
  const fetchPosts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts?ticker=${symbol}`);

      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }

      const data = await response.json();
      setPosts(data.posts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch posts on mount and when symbol changes
  useEffect(() => {
    fetchPosts();
  }, [symbol]);

  // Refresh posts when a new post is created
  const handlePostCreated = () => {
    fetchPosts();
  };

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">
        Community Posts about ${symbol}
      </h2>

      {/* Post form - appears at the top of the posts section */}
      <div className="mb-6">
        <PostForm onPostCreated={handlePostCreated} />
      </div>

      {/* Posts list - shows posts filtered by this stock&apos;s ticker */}
      <PostList posts={posts} isLoading={isLoading} error={error} />
    </section>
  );
}

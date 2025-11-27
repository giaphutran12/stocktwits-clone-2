"use client";

/**
 * HomePage - Main feed showing all posts
 *
 * What it does (simple explanation):
 * - Shows a form to create new posts
 * - Shows a list of all posts from the community
 * - Has a toggle to switch between "Top" (quality sorted) and "Recent" views
 * - Shows trending tickers sidebar on desktop
 * - Automatically refreshes after creating a new post
 *
 * Technical details:
 * - Client component (needs useState, useEffect for interactivity)
 * - Fetches posts from /api/posts with sort param
 * - Default sort is "quality" (AI-ranked posts first)
 * - 2-column layout on desktop (feed + sidebar)
 */

import { useState, useEffect, useCallback } from "react";
import { PostForm } from "@/components/post/post-form";
import { PostList } from "@/components/post/post-list";
import { FeedToggle, SortMode } from "@/components/feed/feed-toggle";
import { TrendingSidebar } from "@/components/sidebar/trending-sidebar";

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("quality"); // Default to quality sort

  // Fetch posts function - wrapped in useCallback since it depends on sortMode
  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Pass sort param to API - "quality" or "recent"
      const response = await fetch(`/api/posts?sort=${sortMode}`);

      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }

      const data = await response.json();
      setPosts(data.posts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching posts:", err);
    } finally {
      setIsLoading(false);
    }
  }, [sortMode]);

  // Fetch posts on mount and when sort mode changes
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Refresh function for onPostCreated callback
  const refreshPosts = () => {
    fetchPosts();
  };

  // Handle sort mode change
  const handleSortChange = (mode: SortMode) => {
    setSortMode(mode);
    // The useEffect will trigger fetchPosts automatically when sortMode changes
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* 2-column layout: Feed (main) + Trending (sidebar on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Main Feed Column */}
        <div>
          {/* Header with title and sort toggle */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Feed</h1>
            <FeedToggle value={sortMode} onChange={handleSortChange} />
          </div>

          {/* Post creation form */}
          <PostForm onPostCreated={refreshPosts} />

          {/* Posts list */}
          <PostList posts={posts} isLoading={isLoading} error={error} />
        </div>

        {/* Sidebar Column - hidden on mobile, visible on desktop (lg+) */}
        <aside className="hidden lg:block">
          <TrendingSidebar />
        </aside>
      </div>
    </div>
  );
}

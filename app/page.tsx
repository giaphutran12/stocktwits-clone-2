"use client";

import { useState, useEffect } from "react";
import { PostForm } from "@/components/post/post-form";
import { PostList } from "@/components/post/post-list";

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch posts function
  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/posts");

      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }

      const data = await response.json();
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching posts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch posts on mount
  useEffect(() => {
    fetchPosts();
  }, []);

  // Refresh function for onPostCreated callback
  const refreshPosts = () => {
    fetchPosts();
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Feed</h1>
      <PostForm onPostCreated={refreshPosts} />
      <PostList posts={posts} isLoading={isLoading} error={error} />
    </div>
  );
}

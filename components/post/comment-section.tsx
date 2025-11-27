"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { MessageCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { CommentCard } from "./comment-card";
import { CommentForm } from "./comment-form";

/**
 * Comment type matching the API response
 */
type Comment = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    imageUrl: string | null;
  };
};

interface CommentSectionProps {
  postId: string;
  commentCount: number;
}

/**
 * CommentSection - Expandable section for viewing and creating comments
 *
 * This component manages the entire comment experience:
 * - Collapsed state: Shows comment count + "View comments" button
 * - Expanded state: Fetches and displays comments + comment form (if logged in)
 *
 * How it works:
 * 1. Initially collapsed, shows comment count
 * 2. When user clicks "View comments", it expands and fetches comments from API
 * 3. Displays list of comments using CommentCard
 * 4. Shows CommentForm at bottom (if user is logged in)
 * 5. When new comment is added, adds it to the list and updates count
 *
 * Features:
 * - Lazy loading: Only fetches comments when section is opened
 * - Auth-aware: Only shows comment form to logged-in users
 * - Loading states: Shows spinner while fetching
 * - Error handling: Shows error message if fetch fails
 */
export function CommentSection({ postId, commentCount: initialCount }: CommentSectionProps) {
  const { isSignedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches comments from API when section is opened for the first time
   */
  const fetchComments = async () => {
    if (hasLoaded) return; // Don't refetch if already loaded

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/comments?limit=10`);

      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }

      const data = await response.json();
      setComments(data.comments);
      setHasLoaded(true);
    } catch (err) {
      console.error("Error fetching comments:", err);
      setError(err instanceof Error ? err.message : "Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles opening/closing the collapsible section
   * Fetches comments on first open
   */
  const handleToggle = () => {
    const newOpenState = !isOpen;
    setIsOpen(newOpenState);

    // Fetch comments when opening for the first time
    if (newOpenState && !hasLoaded) {
      fetchComments();
    }
  };

  /**
   * Callback when a new comment is added
   * Adds the new comment to the top of the list and increments counter
   */
  const handleCommentAdded = (newComment: Comment) => {
    setComments((prev) => [newComment, ...prev]);
    setCommentCount((prev) => prev + 1);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      {/* Trigger Button - Shows comment count and expand/collapse icon */}
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          <MessageCircle className="size-4" />
          <span>
            {commentCount === 0
              ? "No comments yet"
              : commentCount === 1
              ? "1 comment"
              : `${commentCount} comments`}
          </span>
          {isOpen ? (
            <ChevronUp className="size-4 ml-auto" />
          ) : (
            <ChevronDown className="size-4 ml-auto" />
          )}
        </Button>
      </CollapsibleTrigger>

      {/* Collapsible Content - Comments list + form */}
      <CollapsibleContent className="pt-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-4">
            <p className="text-sm text-red-500">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchComments}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Comments List */}
        {!isLoading && !error && (
          <>
            {comments.length === 0 && hasLoaded ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No comments yet. Be the first to comment!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {comments.map((comment) => (
                  <CommentCard key={comment.id} comment={comment} />
                ))}
              </div>
            )}

            {/* Comment Form - Only shown to logged in users */}
            {isSignedIn ? (
              <div className="border-t border-border mt-4">
                <CommentForm
                  postId={postId}
                  onCommentAdded={handleCommentAdded}
                />
              </div>
            ) : (
              <div className="text-center py-4 border-t border-border mt-4">
                <p className="text-sm text-muted-foreground">
                  Sign in to leave a comment
                </p>
              </div>
            )}
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

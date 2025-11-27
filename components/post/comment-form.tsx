"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

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

interface CommentFormProps {
  postId: string;
  onCommentAdded: (comment: Comment) => void;
}

/**
 * CommentForm - Form for creating new comments
 *
 * Features:
 * - Textarea with 280 character limit
 * - Character counter that turns red when approaching limit
 * - Submit button (disabled when empty or over limit)
 * - Loading state while submitting
 * - Enter to submit, Shift+Enter for newline
 *
 * How it works:
 * 1. User types in textarea
 * 2. Character counter updates in real-time
 * 3. Press Enter to submit (or click button)
 * 4. Shows loading spinner while creating comment
 * 5. Calls onCommentAdded callback with new comment
 * 6. Clears the form
 */
export function CommentForm({ postId, onCommentAdded }: CommentFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxLength = 280;
  const remaining = maxLength - content.length;
  const isOverLimit = remaining < 0;
  const isEmpty = content.trim().length === 0;

  /**
   * Handles form submission
   * Sends POST request to create comment, then clears form
   */
  const handleSubmit = async () => {
    if (isEmpty || isOverLimit || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create comment");
      }

      const newComment: Comment = await response.json();

      // Clear form and notify parent
      setContent("");
      onCommentAdded(newComment);
    } catch (error) {
      console.error("Error creating comment:", error);
      alert(error instanceof Error ? error.message : "Failed to create comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles keyboard shortcuts
   * - Enter: Submit (only if not shift-pressed)
   * - Shift+Enter: New line (default textarea behavior)
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (but not Shift+Enter)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent newline
      handleSubmit();
    }
  };

  return (
    <div className="space-y-2 pt-2">
      {/* Textarea */}
      <Textarea
        placeholder="Write a comment..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isSubmitting}
        className="min-h-[80px] resize-none"
        maxLength={maxLength + 50} // Allow typing over limit to show red counter
      />

      {/* Footer: Character counter + Submit button */}
      <div className="flex items-center justify-between">
        {/* Character Counter */}
        <span
          className={`text-xs ${
            isOverLimit
              ? "text-red-500 font-semibold"
              : remaining < 20
              ? "text-yellow-600"
              : "text-muted-foreground"
          }`}
        >
          {remaining} characters remaining
        </span>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isEmpty || isOverLimit || isSubmitting}
          size="sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Posting...
            </>
          ) : (
            "Post Comment"
          )}
        </Button>
      </div>
    </div>
  );
}

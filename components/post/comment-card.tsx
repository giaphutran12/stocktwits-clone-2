"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * Comment type matching Prisma schema + API response
 * This represents a single comment with its author information
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

interface CommentCardProps {
  comment: Comment;
}

/**
 * Converts a date string to a relative time string (e.g., "2h ago", "3d ago")
 * This is a simple implementation - shows how recently the comment was posted
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
 * Gets the initials from a name for avatar fallback
 * If name is "John Doe", returns "JD"
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
 * CommentCard - Displays a single comment
 *
 * This is a compact component designed to show comments in a list.
 * It's smaller and simpler than PostCard since comments are secondary content.
 *
 * Features:
 * - Small avatar (size-7 vs size-10 for posts)
 * - Username and timestamp in one line
 * - Simple text content display
 */
export function CommentCard({ comment }: CommentCardProps) {
  const { user, content, createdAt } = comment;
  const displayName = user.name || user.username || "Anonymous";
  const displayUsername = user.username ? `@${user.username}` : "";

  return (
    <div className="flex gap-2.5 py-3">
      {/* Avatar - Smaller than post author avatar */}
      <Avatar className="size-7 mt-0.5">
        {user.imageUrl && (
          <AvatarImage src={user.imageUrl} alt={displayName} />
        )}
        <AvatarFallback className="text-xs">
          {getInitials(user.name, user.username)}
        </AvatarFallback>
      </Avatar>

      {/* Comment Content */}
      <div className="flex-1 space-y-1">
        {/* Author and Time - Single line for compact design */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{displayName}</span>
          {displayUsername && (
            <span className="text-muted-foreground text-xs">
              {displayUsername}
            </span>
          )}
          <span className="text-muted-foreground text-xs">
            •
          </span>
          <span className="text-muted-foreground text-xs">
            {getRelativeTime(createdAt)}
          </span>
        </div>

        {/* Comment Text */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      </div>
    </div>
  );
}

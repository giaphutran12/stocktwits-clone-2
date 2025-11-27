"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Profile header component - displays user information at the top of their profile page
 *
 * Shows:
 * - Large avatar image
 * - Name (or username if no name is set)
 * - @username handle
 * - Bio (if they have one)
 * - Stats: number of posts and when they joined
 *
 * This is a "client component" (note the "use client" at the top) because
 * we might add interactive features later (like follow button, edit profile, etc.)
 */

interface ProfileHeaderProps {
  user: {
    username: string;
    name: string | null;
    imageUrl: string | null;
    bio: string | null;
    createdAt: string;
    _count: { posts: number };
  };
}

/**
 * Helper function: Gets initials for avatar fallback
 *
 * Examples:
 * - "John Doe" → "JD"
 * - "Alice" → "AL"
 * - No name, username "trader123" → "TR"
 */
function getInitials(name: string | null, username: string): string {
  if (name) {
    const names = name.split(" ");
    if (names.length >= 2) {
      // Take first letter of first name and last name
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    // Single name: take first 2 letters
    return name.slice(0, 2).toUpperCase();
  }
  // No name: use first 2 letters of username
  return username.slice(0, 2).toUpperCase();
}

/**
 * Helper function: Formats date to "Joined [Month] [Year]"
 *
 * Example: "2024-11-15T10:30:00Z" → "Joined November 2024"
 */
function formatJoinDate(dateString: string): string {
  const date = new Date(dateString);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `Joined ${month} ${year}`;
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
  // Display name: use their actual name if they have one, otherwise use username
  const displayName = user.name || user.username;
  const displayUsername = `@${user.username}`;

  return (
    <Card className="mb-6">
      <CardContent className="space-y-4">
        {/* Avatar and Basic Info */}
        <div className="flex items-start gap-4">
          {/* Large avatar (size-24 = 96px x 96px) */}
          <Avatar className="size-24">
            {user.imageUrl && (
              <AvatarImage src={user.imageUrl} alt={displayName} />
            )}
            <AvatarFallback className="text-2xl">
              {getInitials(user.name, user.username)}
            </AvatarFallback>
          </Avatar>

          {/* Name and Username */}
          <div className="flex-1 space-y-1">
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-muted-foreground">{displayUsername}</p>
          </div>
        </div>

        {/* Bio (only shown if user has one) */}
        {user.bio && (
          <p className="text-sm leading-relaxed">{user.bio}</p>
        )}

        {/* Stats: Post count and join date */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground">{user._count.posts}</span>
            {" "}
            {user._count.posts === 1 ? "post" : "posts"}
          </div>
          <div>•</div>
          <div>{formatJoinDate(user.createdAt)}</div>
        </div>
      </CardContent>
    </Card>
  );
}

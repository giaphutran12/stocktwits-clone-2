import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ProfileHeader } from "@/components/user/profile-header";
import { PostList } from "@/components/post/post-list";
import { db } from "@/lib/db";

/**
 * User Profile Page
 *
 * This page shows:
 * 1. User&apos;s profile header (avatar, name, bio, stats)
 * 2. All posts made by the user
 *
 * This is a Server Component - it runs on the server and fetches data
 * before sending the page to the browser. This is faster than fetching
 * on the client side.
 *
 * The [username] in the folder name makes this a "dynamic route" - it
 * works for any username (e.g., /profile/john, /profile/alice, etc.)
 */

/**
 * Type definition for the page params
 * Next.js 15+ requires us to await params
 */
type PageProps = {
  params: Promise<{ username: string }>;
};

/**
 * Generate page metadata for SEO
 *
 * This sets the browser tab title to "@username | Stolk"
 * Example: "@johndoe | Stolk"
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;

  return {
    title: `@${username} | Stolk`,
  };
}

/**
 * Helper function: Fetch user data from database
 *
 * Gets user info and post count. Returns null if user doesn&apos;t exist.
 */
async function getUser(username: string) {
  return await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      imageUrl: true,
      bio: true,
      createdAt: true,
      _count: {
        select: {
          posts: true,
        },
      },
    },
  });
}

/**
 * Helper function: Fetch all posts by a user
 *
 * Gets posts with all the related data we need to display them:
 * - Author info
 * - Tickers mentioned
 * - Like and comment counts
 * - AI analysis data
 *
 * Returns posts sorted by newest first
 */
async function getUserPosts(userId: string) {
  return await db.post.findMany({
    where: {
      authorId: userId,
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          name: true,
          imageUrl: true,
        },
      },
      tickers: {
        select: {
          symbol: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc", // Newest posts first
    },
  });
}

/**
 * Main page component
 *
 * Server Component that fetches user and posts data, then renders the profile
 */
export default async function ProfilePage({ params }: PageProps) {
  // Get username from URL
  const { username } = await params;

  // Fetch user data and their posts in parallel
  // Promise.all runs both database queries at the same time (faster!)
  const [user, rawPosts] = await Promise.all([
    getUser(username),
    // We need to get the user first to get their ID, so we do this in two steps
    getUser(username).then((u) => u ? getUserPosts(u.id) : []),
  ]);

  // If user doesn&apos;t exist, show 404 page
  // notFound() is a Next.js function that shows the 404 page
  if (!user) {
    notFound();
  }

  // Convert posts to the format our components expect
  // We need to convert Date objects to strings for JSON serialization
  // Note: hasLiked is set to false - profile pages don't check liked status
  // (would require auth, and profile pages can be viewed by anyone)
  const posts = rawPosts.map((post) => ({
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    hasLiked: false, // Profile pages don't track user's liked status
  }));

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      {/* Profile Header - shows user avatar, name, bio, stats */}
      <ProfileHeader
        user={{
          username: user.username!,
          name: user.name,
          imageUrl: user.imageUrl,
          bio: user.bio,
          createdAt: user.createdAt.toISOString(),
          _count: user._count,
        }}
      />

      {/* Posts Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Posts</h2>

        {/* PostList handles empty state, loading, and displaying posts */}
        <PostList posts={posts} />
      </div>
    </div>
  );
}

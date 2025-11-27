import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/users/[username]
 *
 * Fetches a user by username along with their stats (post count).
 * This is used for displaying user profiles.
 *
 * What this does:
 * 1. Takes the username from the URL (e.g., /api/users/johndoe)
 * 2. Looks up the user in the database
 * 3. Also counts how many posts they&apos;ve made
 * 4. Returns the user info or a 404 if not found
 *
 * Technical term: This is a "dynamic route" - the [username] part makes it work
 * for any username. Next.js automatically gives us the username in params.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    // Await params (Next.js 15+ requires this)
    const { username } = await params;

    // Fetch user from database with post count
    // The _count option tells Prisma to count related records
    const user = await db.user.findUnique({
      where: {
        username: username,
      },
      select: {
        id: true,
        username: true,
        name: true,
        imageUrl: true,
        bio: true,
        createdAt: true,
        // This counts how many posts the user has made
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });

    // If user doesn&apos;t exist, return 404 (Not Found)
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Return user data with post count
    return NextResponse.json({
      user: {
        ...user,
        // Convert createdAt Date object to ISO string for JSON
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

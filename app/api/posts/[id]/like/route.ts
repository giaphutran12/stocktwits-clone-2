/**
 * /api/posts/[id]/like - Post like toggle endpoint
 *
 * POST: Toggle like on a post (create if not liked, delete if already liked)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

/**
 * POST /api/posts/[id]/like - Toggle like on a post
 *
 * How it works:
 * 1. Checks if the user is logged in using Clerk's auth()
 * 2. Gets the post ID from the URL params
 * 3. Checks if the user has already liked this post
 * 4. If already liked: removes the like (unlike)
 * 5. If not liked: creates a new like
 * 6. Returns the new like status and updated like count
 *
 * URL params:
 * - id: The post ID to like/unlike
 *
 * Returns:
 * {
 *   liked: boolean,      // true if now liked, false if now unliked
 *   likeCount: number    // total number of likes on the post
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Step 1: Check if user is authenticated
    // auth() returns an object with userId if logged in, null if not
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - You must be logged in to like a post' },
        { status: 401 }
      );
    }

    // Step 2: Get the post ID from the URL params
    // In Next.js 15+, params is a Promise that needs to be awaited
    const { id: postId } = await params;

    // Step 3: Check if the user has already liked this post
    // We use findUnique with a composite unique constraint (userId + postId)
    // This is defined in the Prisma schema as @@unique([userId, postId])
    const existingLike = await db.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    // Step 4 & 5: Toggle the like (delete if exists, create if not)
    let liked: boolean;

    if (existingLike) {
      // User has already liked this post, so we UNLIKE it (remove the like)
      await db.like.delete({
        where: {
          id: existingLike.id,
        },
      });
      liked = false;
    } else {
      // User hasn't liked this post yet, so we CREATE a like
      await db.like.create({
        data: {
          userId,
          postId,
        },
      });
      liked = true;
    }

    // Step 6: Get the updated like count for this post
    // We count all likes associated with this post
    const likeCount = await db.like.count({
      where: {
        postId,
      },
    });

    // Step 7: Return the new like status and count
    return NextResponse.json({
      liked,
      likeCount,
    });

  } catch (error) {
    // Log the error for debugging
    console.error('[Like Toggle] Error:', error);

    // Return a generic error response
    // We don't expose internal error details to the client
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    );
  }
}

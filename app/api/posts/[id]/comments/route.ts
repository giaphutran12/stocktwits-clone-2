/**
 * /api/posts/[id]/comments - Comment endpoints for a specific post
 *
 * GET: Fetch comments for a post with cursor-based pagination
 * POST: Create a new comment (requires authentication)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

/**
 * GET /api/posts/[id]/comments - Fetch comments for a post
 *
 * How it works:
 * 1. Extracts the post ID from the URL params
 * 2. Supports cursor-based pagination for efficient scrolling
 * 3. Fetches comments with author info sorted by newest first
 * 4. Returns comments and a cursor for the next page
 *
 * Query parameters:
 * - cursor: The createdAt timestamp of the last comment from previous page (optional)
 * - limit: Number of comments to fetch (default: 10, max: 50)
 *
 * Response format:
 * {
 *   comments: Comment[],
 *   nextCursor: string | null  // null when no more comments
 * }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Step 1: Get post ID from URL params
    const { id: postId } = await params;

    // Step 2: Parse query parameters
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor'); // Timestamp of last comment from previous page
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 10;

    // Validate limit
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        { error: 'Limit must be a positive number' },
        { status: 400 }
      );
    }

    // Step 3: Build the query filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { postId };

    // Add cursor-based pagination filter
    // If cursor is provided, fetch comments older than the cursor
    if (cursor) {
      where.createdAt = {
        lt: new Date(cursor), // "lt" = less than (older than cursor)
      };
    }

    // Step 4: Fetch comments from database
    // We fetch limit + 1 to check if there are more comments (for nextCursor)
    const comments = await db.comment.findMany({
      where,
      orderBy: {
        createdAt: 'desc', // Newest first
      },
      take: limit + 1, // Fetch one extra to determine if there's a next page
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    // Step 5: Determine if there's a next page
    let nextCursor: string | null = null;
    if (comments.length > limit) {
      // Remove the extra comment we fetched
      const nextComment = comments.pop();
      if (nextComment) {
        nextCursor = nextComment.createdAt.toISOString();
      }
    }

    // Step 6: Return comments with pagination info
    return NextResponse.json(
      {
        comments,
        nextCursor,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Internal server error - Failed to fetch comments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts/[id]/comments - Create a new comment
 *
 * How it works:
 * 1. Checks if user is authenticated
 * 2. Ensures user exists in database (syncs from Clerk if needed)
 * 3. Validates comment content (max 280 characters)
 * 4. Creates comment in database
 * 5. Returns created comment with author info
 *
 * Request body:
 * {
 *   content: string  // Comment text (required, max 280 chars)
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Step 1: Check if user is authenticated
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - You must be logged in to comment' },
        { status: 401 }
      );
    }

    // Step 2: Ensure user exists in database (sync from Clerk if needed)
    // This is the same pattern used in POST /api/posts
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    await db.user.upsert({
      where: { id: userId },
      update: {}, // Don't update if they already exist
      create: {
        id: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        username: clerkUser.username || clerkUser.id,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
        imageUrl: clerkUser.imageUrl || null,
      },
    });

    // Step 3: Get post ID from URL params
    const { id: postId } = await params;

    // Step 4: Parse and validate request body
    const body = await req.json();
    const { content } = body;

    // Validation: Content is required
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }

    // Validation: Content must not be empty
    if (content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content cannot be empty' },
        { status: 400 }
      );
    }

    // Validation: Content must be max 280 characters
    if (content.length > 280) {
      return NextResponse.json(
        { error: 'Comment must be 280 characters or less' },
        { status: 400 }
      );
    }

    // Step 5: Verify post exists
    const post = await db.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Step 6: Create comment in database
    const comment = await db.comment.create({
      data: {
        content,
        userId,
        postId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    // Step 7: Return created comment
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Internal server error - Failed to create comment' },
      { status: 500 }
    );
  }
}

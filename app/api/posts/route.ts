/**
 * /api/posts - Post creation and retrieval endpoints
 *
 * POST: Create a new post with tickers and sentiment
 * GET: Fetch posts with optional filtering by ticker, sentiment, and limit
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { parseTickers } from '@/lib/parse-tickers';
import { Sentiment } from '@/lib/generated/prisma';

/**
 * POST /api/posts - Create a new post
 *
 * How it works:
 * 1. Checks if the user is logged in using Clerk's auth()
 * 2. Validates the post content (can't be empty, max 500 characters)
 * 3. Extracts stock tickers from the content (e.g., $AAPL, $TSLA)
 * 4. Saves the post to the database with all the tickers it mentions
 * 5. Returns the created post with author info
 *
 * Request body:
 * {
 *   content: string,      // The post text (required, max 500 chars)
 *   sentiment: Sentiment  // BULLISH, BEARISH, or NEUTRAL (required)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Step 1: Check if user is authenticated
    // auth() returns an object with userId if logged in, null if not
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - You must be logged in to create a post' },
        { status: 401 }
      );
    }

    // Step 1.5: Ensure user exists in database
    // This handles the case where a user is authenticated with Clerk but hasn't
    // been synced to our database yet (webhook hasn't fired or isn't set up)
    // We use upsert() which means: "update if exists, create if doesn't"
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

    // Step 2: Parse and validate request body
    const body = await req.json();
    const { content, sentiment } = body;

    // Validation: Content is required
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }

    // Validation: Content must not be empty (after trimming whitespace)
    if (content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Post content cannot be empty' },
        { status: 400 }
      );
    }

    // Validation: Content must be max 500 characters
    if (content.length > 500) {
      return NextResponse.json(
        { error: 'Post content must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Validation: Sentiment must be valid
    if (!sentiment || !['BULLISH', 'BEARISH', 'NEUTRAL'].includes(sentiment)) {
      return NextResponse.json(
        { error: 'Sentiment must be BULLISH, BEARISH, or NEUTRAL' },
        { status: 400 }
      );
    }

    // Step 3: Extract ticker symbols from content
    // parseTickers("I love $AAPL and $TSLA") → ["AAPL", "TSLA"]
    const tickers = parseTickers(content);

    // Step 4: Create post in database with tickers
    // We use Prisma's "create" with nested "createMany" to create the post
    // and all its associated tickers in one database transaction
    const post = await db.post.create({
      data: {
        content,
        sentiment: sentiment as Sentiment,
        authorId: userId,
        // Create PostTicker records for each extracted ticker
        tickers: {
          createMany: {
            data: tickers.map((symbol) => ({ symbol })),
          },
        },
      },
      // Include related data in the response
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
    });

    // Step 5: Trigger async AI analysis (fire-and-forget)
    // This calls the analyze endpoint without waiting for it to complete
    // The post is returned immediately, and AI fields populate in the background
    triggerAsyncAnalysis(post.id, req);

    // Step 6: Return the created post
    return NextResponse.json(post, { status: 201 });

  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Internal server error - Failed to create post' },
      { status: 500 }
    );
  }
}

/**
 * Triggers async AI analysis for a post
 *
 * Why fire-and-forget:
 * - Post creation stays fast (~100ms)
 * - AI analysis can take 1-3 seconds
 * - User sees their post immediately
 * - Analysis results populate when ready
 *
 * How it works:
 * - Makes a POST request to /api/posts/[id]/analyze
 * - Doesn't await the response (fire-and-forget)
 * - Errors are logged but don't affect the user
 */
function triggerAsyncAnalysis(postId: string, req: NextRequest) {
  try {
    // Build the analyze endpoint URL using the request's origin
    const origin = req.nextUrl.origin;
    const analyzeUrl = `${origin}/api/posts/${postId}/analyze`;

    // Fire-and-forget: call the endpoint but don't wait for response
    // We use .catch() to handle any network errors silently
    fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch((error) => {
      // Log the error but don't throw - this is background work
      console.error('[AsyncAnalysis] Failed to trigger analysis:', error);
    });

    console.log(`[AsyncAnalysis] Triggered for post ${postId}`);
  } catch (error) {
    // If something goes wrong building the URL, just log it
    console.error('[AsyncAnalysis] Error:', error);
  }
}

/**
 * GET /api/posts - Fetch posts with optional filtering and sorting
 *
 * How it works:
 * 1. Reads query parameters from the URL (?ticker=AAPL&sentiment=BULLISH&limit=10&sort=quality)
 * 2. Builds a database query based on the filters
 * 3. Fetches posts sorted by quality score or date with author info and engagement counts
 * 4. Returns an array of posts including AI analysis fields
 *
 * Query parameters (all optional):
 * - ticker: Filter by stock symbol (e.g., ?ticker=AAPL shows only posts mentioning $AAPL)
 * - sentiment: Filter by sentiment (e.g., ?sentiment=BULLISH)
 * - limit: Max number of posts to return (default: 20, e.g., ?limit=50)
 * - sort: Sort order - "quality" (default) or "recent"
 *         quality: High-quality posts first (by qualityScore DESC, then createdAt DESC)
 *         recent: Newest posts first (by createdAt DESC)
 *
 * Example URLs:
 * - /api/posts → Get 20 top quality posts
 * - /api/posts?sort=recent → Get 20 latest posts
 * - /api/posts?ticker=AAPL → Get posts mentioning $AAPL, sorted by quality
 * - /api/posts?sentiment=BULLISH&limit=50&sort=recent → Get 50 latest bullish posts
 */
export async function GET(req: NextRequest) {
  try {
    // Step 1: Parse query parameters from URL
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get('ticker');
    const sentiment = searchParams.get('sentiment');
    const limitParam = searchParams.get('limit');
    const sort = searchParams.get('sort') || 'quality'; // Default to quality sort

    // Convert limit to number, default to 20 if not provided or invalid
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    // Validate limit is a positive number
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        { error: 'Limit must be a positive number' },
        { status: 400 }
      );
    }

    // Step 2: Build the database query filter
    // This object will be passed to Prisma's "where" clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Filter by ticker if provided
    if (ticker) {
      where.tickers = {
        some: {
          symbol: ticker.toUpperCase(),
        },
      };
    }

    // Filter by sentiment if provided
    if (sentiment) {
      // Validate sentiment is valid
      if (!['BULLISH', 'BEARISH', 'NEUTRAL'].includes(sentiment.toUpperCase())) {
        return NextResponse.json(
          { error: 'Sentiment must be BULLISH, BEARISH, or NEUTRAL' },
          { status: 400 }
        );
      }
      where.sentiment = sentiment.toUpperCase() as Sentiment;
    }

    // Step 3: Build sort order based on 'sort' param
    // - "quality": High quality first, then newest (posts without scores go last)
    // - "recent": Newest first (traditional chronological order)
    const orderBy =
      sort === 'recent'
        ? [{ createdAt: 'desc' as const }]
        : [
            // Sort by quality score descending (nulls last via Prisma default)
            { qualityScore: 'desc' as const },
            // Then by creation date for posts with same score
            { createdAt: 'desc' as const },
          ];

    // Step 4: Fetch posts from database
    const posts = await db.post.findMany({
      where,
      orderBy,
      // Limit the number of results
      take: limit,
      // Include related data
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
        // Get counts of likes and comments (for engagement metrics)
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    // Step 5: Return the posts array wrapped in an object
    // Frontend expects { posts: [...] } format, not raw array
    // Posts now include AI fields: qualityScore, insightType, sector, summary
    return NextResponse.json({ posts }, { status: 200 });

  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Internal server error - Failed to fetch posts' },
      { status: 500 }
    );
  }
}

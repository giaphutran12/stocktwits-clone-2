/**
 * /api/posts - Post creation and retrieval endpoints
 *
 * POST: Create a new post with tickers and sentiment
 * GET: Fetch posts with optional filtering by ticker, sentiment, and limit
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
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

    // Step 5: Return the created post
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
 * GET /api/posts - Fetch posts with optional filtering
 *
 * How it works:
 * 1. Reads query parameters from the URL (?ticker=AAPL&sentiment=BULLISH&limit=10)
 * 2. Builds a database query based on the filters
 * 3. Fetches posts from newest to oldest with author info and engagement counts
 * 4. Returns an array of posts
 *
 * Query parameters (all optional):
 * - ticker: Filter by stock symbol (e.g., ?ticker=AAPL shows only posts mentioning $AAPL)
 * - sentiment: Filter by sentiment (e.g., ?sentiment=BULLISH)
 * - limit: Max number of posts to return (default: 20, e.g., ?limit=50)
 *
 * Example URLs:
 * - /api/posts → Get 20 latest posts
 * - /api/posts?ticker=AAPL → Get posts mentioning $AAPL
 * - /api/posts?sentiment=BULLISH&limit=50 → Get 50 latest bullish posts
 */
export async function GET(req: NextRequest) {
  try {
    // Step 1: Parse query parameters from URL
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get('ticker');
    const sentiment = searchParams.get('sentiment');
    const limitParam = searchParams.get('limit');

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

    // Step 3: Fetch posts from database
    const posts = await db.post.findMany({
      where,
      // Order by newest first (most recent posts at the top)
      orderBy: {
        createdAt: 'desc',
      },
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

    // Step 4: Return the posts array
    return NextResponse.json(posts, { status: 200 });

  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Internal server error - Failed to fetch posts' },
      { status: 500 }
    );
  }
}

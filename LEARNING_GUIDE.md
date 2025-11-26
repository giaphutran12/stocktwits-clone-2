# StockTwits Clone - Complete Learning Guide
**From Junior to Senior: Understanding Every Piece of the Codebase**

---

## Table of Contents
1. [The Big Picture](#the-big-picture)
2. [How Data Flows](#how-data-flows)
3. [File-by-File Breakdown](#file-by-file-breakdown)
4. [Connection Map](#connection-map)
5. [Common Patterns](#common-patterns)
6. [Code Walkthroughs](#code-walkthroughs)
7. [Quick Reference](#quick-reference)

---

## The Big Picture

### What Does This App Do? (Simple)
Imagine Twitter, but only for talking about stocks. Users can:
- Post their thoughts about stocks (like "$AAPL is going to the moon! 🚀")
- See stock prices and charts
- View what others are saying about specific stocks
- Choose if they're feeling bullish (positive), bearish (negative), or neutral

### User Journey
```
1. User visits homepage
   ↓
2. Signs in with Clerk (email/Google/etc.)
   ↓
3. Creates a post: "I love $AAPL and $TSLA!"
   ↓
4. System detects tickers ($AAPL, $TSLA) automatically
   ↓
5. Post saved to database with ticker links
   ↓
6. User clicks "$AAPL" to see stock page
   ↓
7. Sees price chart + all posts about $AAPL
```

### Tech Stack (Why Each Technology?)

**Next.js 16** - The Framework
- Why: React with built-in routing, server components, and API routes
- What it solves: Don't have to set up separate frontend + backend

**TypeScript** - Type Safety
- Why: Catches bugs before they happen
- What it solves: "Cannot read property 'x' of undefined" errors

**Prisma** - Database Tool
- Why: Talk to PostgreSQL database using JavaScript/TypeScript
- What it solves: Writing SQL queries manually (error-prone)

**Clerk** - Authentication
- Why: User login/signup without building it yourself
- What it solves: Password hashing, security, OAuth, session management

**Tailwind CSS** - Styling
- Why: Style components with utility classes
- What it solves: Writing custom CSS files

**shadcn/ui** - Component Library
- Why: Pre-built, accessible UI components
- What it solves: Building buttons, cards, forms from scratch

**Yahoo Finance (yahoo-finance2)** - Stock Data
- Why: Get real stock prices and historical data
- What it solves: Need stock market data without paying for APIs

**Recharts** - Charts/Graphs
- Why: Visualize stock price history
- What it solves: Drawing graphs manually with SVG/Canvas

---

## How Data Flows

### Flow 1: Creating a Post

```
┌─────────────────┐
│  User types in  │
│   PostForm      │  (components/post/post-form.tsx)
│  "I love $AAPL" │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  parseTickers()         │  (lib/parse-tickers.ts)
│  Extracts: ["AAPL"]     │
│  Shown as badges        │
└────────┬────────────────┘
         │
         ▼ (User clicks "Post")
┌─────────────────────────┐
│  POST /api/posts        │  (app/api/posts/route.ts)
│  Validates + Authenticates
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Check user exists      │
│  (Clerk → Database)     │
│  Creates if needed      │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Prisma creates:             │
│  1. Post record              │  (prisma/schema.prisma)
│  2. PostTicker records       │
│     (link post to $AAPL)     │
└────────┬─────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Return post data       │
│  to frontend            │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  PostForm clears        │
│  Shows success          │
│  Parent refreshes feed  │
└─────────────────────────┘
```

### Flow 2: Viewing a Stock Page

```
User navigates to /stock/AAPL
         │
         ▼
┌─────────────────────────────┐
│  StockPage (Server)         │  (app/stock/[symbol]/page.tsx)
│  Receives symbol="AAPL"     │
└────────┬────────────────────┘
         │
         ├─────────────────────────┐
         │                         │
         ▼                         ▼
┌──────────────────┐    ┌──────────────────────┐
│  StockStats      │    │  StockChart          │
│  (Client)        │    │  (Client)            │
└────────┬─────────┘    └────────┬─────────────┘
         │                       │
         ▼                       ▼
┌──────────────────────────────────────┐
│  GET /api/stocks/AAPL                │  (app/api/stocks/[symbol]/route.ts)
│  GET /api/stocks/AAPL/history       │
│                                      │
│  Calls Yahoo Finance API             │  (lib/yahoo-finance.ts)
│  Returns price data                  │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  Display chart   │
│  + stats         │
└──────────────────┘
         │
         ▼ (Meanwhile...)
┌─────────────────────────────┐
│  StockPostsSection (Client) │  (components/stock/stock-posts-section.tsx)
│  Fetches posts for $AAPL   │
└────────┬────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  GET /api/posts?ticker=AAPL  │  (app/api/posts/route.ts)
│  Filters by PostTicker       │
│  Returns posts               │
└────────┬─────────────────────┘
         │
         ▼
┌─────────────────┐
│  PostList shows │  (components/post/post-list.tsx)
│  PostCard items │  (components/post/post-card.tsx)
└─────────────────┘
```

### Flow 3: User Authentication & Sync

```
User signs up with Clerk
         │
         ▼
┌─────────────────────┐
│  Clerk creates user │
│  (external service) │
└────────┬────────────┘
         │
         ├───────────────────┐
         │                   │
         ▼                   ▼ (optional webhook)
┌─────────────────┐   ┌──────────────────────┐
│  User tries to  │   │  POST /api/webhooks/ │
│  create post    │   │  clerk               │
└────────┬────────┘   └─────┬────────────────┘
         │                  │
         ▼                  ▼
┌──────────────────────────────────┐
│  POST /api/posts checks:         │
│  1. Clerk auth (userId exists)   │
│  2. User in database?            │
│     - NO: Create user (upsert)   │  (Inline fallback)
│     - YES: Continue              │
└──────────────────────────────────┘
```

---

## File-by-File Breakdown

### 📁 Configuration Files

#### `package.json`
**What it does (simple):**
Think of this as a shopping list and instruction manual for your app. It lists all the packages (libraries) you need and commands you can run.

**What it does (technical):**
NPM package manifest defining dependencies, dev dependencies, and npm scripts.

**Why it exists:**
Without it, npm wouldn't know what packages to install or how to run your app.

**Key sections:**
- Lines 5-11: Scripts (commands you can run)
  - `npm run dev` - Start development server
  - `npm run build` - Build for production
  - `postinstall` - Auto-generates Prisma types after install
- Lines 12-66: Dependencies (packages the app needs)
  - `@clerk/nextjs` - Authentication
  - `@prisma/client` - Database ORM
  - `yahoo-finance2` - Stock data
  - `recharts` - Charts

**Connects to:**
- All other files (they import these packages)

---

#### `tsconfig.json`
**What it does (simple):**
Settings file that tells TypeScript how to check your code and where to find files.

**What it does (technical):**
TypeScript compiler configuration specifying module resolution, paths, and type-checking rules.

**Why it exists:**
TypeScript needs to know how strict to be and where imports like `@/lib/db` should resolve to.

**Key settings:**
- `paths`: Defines `@/*` as alias for `./*` (so you can write `@/lib/db` instead of `../../lib/db`)
- `strict`: true - Maximum type safety
- `jsx`: "preserve" - Keep JSX for Next.js to handle

---

#### `next.config.ts`
**What it does (simple):**
Configuration file telling Next.js how to build and run your app.

**What it does (technical):**
Next.js configuration object with build settings, redirects, and feature flags.

**Why it exists:**
Customize Next.js behavior (e.g., enable experimental features, configure redirects).

---

#### `middleware.ts`
**What it does (simple):**
A security guard that checks if you're logged in before letting you access certain pages.

**What it does (technical):**
Next.js middleware intercepting requests to run Clerk authentication before route handlers execute.

**Why it exists:**
Protects routes - without it, anyone could access pages/APIs without logging in.

**How it works:**
1. Every request hits middleware first
2. Clerk checks if user has valid session
3. If not logged in + trying to access protected route → redirect to sign-in
4. If logged in → request proceeds to page/API

**Connects to:**
- All pages and API routes (runs before them)
- Clerk auth system

---

### 📁 Database

#### `prisma/schema.prisma`
**What it does (simple):**
Blueprint for your database. Defines what tables exist and how they relate to each other.

**What it does (technical):**
Prisma schema defining database models, fields, relationships, and indexes.

**Why it exists:**
Prisma generates TypeScript types from this file, giving you type-safe database queries.

**Key models:**
```prisma
model User {
  id        String   @id
  username  String   @unique
  posts     Post[]   // One user has many posts
}

model Post {
  id        String   @id @default(uuid())
  content   String
  sentiment Sentiment
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  tickers   PostTicker[]  // One post can have many tickers
}

model PostTicker {
  id      String @id @default(uuid())
  symbol  String    // e.g., "AAPL"
  post    Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId  String
}
```

**Why PostTicker exists:**
It creates a many-to-many relationship. One post can mention multiple stocks ($AAPL, $TSLA), and one stock can be mentioned in many posts.

**Connects to:**
- `lib/db.ts` - Uses generated Prisma client
- All API routes that read/write database

**Commands:**
- `npx prisma migrate dev` - Create migration from schema changes
- `npx prisma generate` - Generate TypeScript types
- `npx prisma studio` - GUI database browser

---

#### `lib/db.ts`
**What it does (simple):**
Creates a single connection to the database that the whole app shares.

**What it does (technical):**
Singleton pattern for Prisma Client to prevent multiple database connections in development hot-reload.

**Why it exists:**
Without this pattern, every file edit in dev mode would create a new database connection, eventually maxing out connections.

**How it works:**
```typescript
// First import: Creates new PrismaClient
// Subsequent imports: Returns same instance
const prismaClientSingleton = () => {
  return new PrismaClient()
}

// In development, store on global object (survives hot-reload)
// In production, create new each time (server only starts once)
const db = globalThis.prismaGlobal ?? prismaClientSingleton()

export { db }
```

**Connects to:**
- All API routes import this
- Uses DATABASE_URL from .env

---

### 📁 API Routes

#### `app/api/posts/route.ts`
**What it does (simple):**
The endpoint that creates new posts and fetches existing posts.

**What it does (technical):**
Next.js App Router API route with POST and GET handlers for CRUD operations on posts.

**Why it exists:**
Frontend needs somewhere to send data and fetch data - this is that "somewhere."

**POST Handler (lines 30-150):**
```
1. Check auth (line 34)
2. Ensure user exists in DB (lines 47-60)
   - Calls Clerk API to get user info
   - Upserts user (creates if doesn't exist)
3. Validate post content (lines 66-96)
   - Not empty, max 500 chars, valid sentiment
4. Parse tickers (line 100)
   - Extract ["AAPL", "TSLA"] from content
5. Create post + PostTicker records (lines 105-139)
   - Single transaction
   - Include author, tickers, engagement counts
6. Return created post
```

**GET Handler (lines 172-261):**
```
1. Parse query params (lines 175-181)
   - ticker, sentiment, limit
2. Build where filter (lines 194-215)
   - Filter by ticker: { tickers: { some: { symbol: "AAPL" } } }
   - Filter by sentiment: { sentiment: "BULLISH" }
3. Fetch posts (lines 218-249)
   - Order by newest first
   - Include author, tickers, engagement counts
4. Return { posts: [...] } (line 234)
   - **CRITICAL**: Wrapped in object, not raw array
```

**Why wrapped response?**
Frontend expects `data.posts`, not `data[0]`. This was a bug we fixed!

**Connects to:**
- `lib/db.ts` - Database queries
- `lib/parse-tickers.ts` - Ticker extraction
- `components/post/post-form.tsx` - Calls POST
- `components/stock/stock-posts-section.tsx` - Calls GET with ticker filter

---

#### `app/api/stocks/[symbol]/route.ts`
**What it does (simple):**
Gets current stock price and info when you visit a stock page.

**What it does (technical):**
Dynamic API route accepting stock symbol parameter, proxying request to Yahoo Finance.

**Why it exists:**
Can't call Yahoo Finance directly from browser (CORS), so we proxy through our server.

**How it works:**
```typescript
// URL: /api/stocks/AAPL
export async function GET(req, { params }) {
  const { symbol } = await params  // "AAPL"

  const quote = await getStockQuote(symbol)  // Calls Yahoo Finance

  return NextResponse.json(quote)
}
```

**IMPORTANT: Runtime Config (line 11)**
```typescript
export const runtime = "nodejs"
```
Without this, it runs on Edge Runtime which doesn't support yahoo-finance2 package.

**Connects to:**
- `lib/yahoo-finance.ts` - Yahoo Finance wrapper
- `components/stock/stock-stats.tsx` - Fetches from this endpoint

---

#### `app/api/stocks/[symbol]/history/route.ts`
**What it does (simple):**
Gets historical stock prices (last 30 days) for the chart.

**What it does (technical):**
Dynamic API route returning time-series price data.

**How it works:**
Similar to stock quote route, but calls `getHistoricalData()` instead.

**Connects to:**
- `lib/yahoo-finance.ts`
- `components/stock/stock-chart.tsx`

---

#### `app/api/webhooks/clerk/route.ts`
**What it does (simple):**
Clerk calls this URL whenever a user signs up, updates their profile, or deletes their account. It keeps our database in sync.

**What it does (technical):**
Webhook endpoint receiving Clerk events, verifying signatures with Svix, and syncing user data to database.

**Why it exists:**
Automatically create/update/delete users in our database when changes happen in Clerk.

**How it works:**
```
1. Clerk event happens (user.created, user.updated, user.deleted)
2. Clerk sends POST to our webhook
3. Verify signature with Svix (line 25)
   - Prevents fake requests
4. Parse event type
5. Update database accordingly
   - user.created → db.user.create()
   - user.updated → db.user.update()
   - user.deleted → db.user.delete()
```

**Security:**
- Requires CLERK_WEBHOOK_SECRET environment variable
- Validates signature to ensure request came from Clerk

**Connects to:**
- lib/db.ts
- Clerk dashboard (you configure webhook URL there)

---

### 📁 Pages (App Router)

#### `app/layout.tsx`
**What it does (simple):**
The "wrapper" that goes around every page. Contains the HTML structure, fonts, and Clerk provider.

**What it does (technical):**
Root layout component wrapping all pages with ClerkProvider and consistent structure.

**Why it exists:**
Every Next.js app needs a root layout. This is where you add things that appear on ALL pages.

**Key parts:**
- ClerkProvider (line ~20): Makes Clerk auth available everywhere
- metadata (line ~10): Sets `<title>` and `<meta>` tags
- Geist font (line ~15): Loads custom font

**Connects to:**
- Wraps all pages (app/page.tsx, app/stock/[symbol]/page.tsx)
- Makes Clerk available to all components

---

#### `app/page.tsx`
**What it does (simple):**
The homepage - shows a feed of all posts.

**What it does (technical):**
Server Component rendering main feed with PostForm and PostList.

**Why Server Component?**
Can fetch initial data on server for faster page loads.

**Structure:**
```tsx
<main>
  <PostForm onPostCreated={refreshPosts} />
  <PostList posts={posts} />
</main>
```

**Connects to:**
- `components/post/post-form.tsx`
- `components/post/post-list.tsx`

---

#### `app/stock/[symbol]/page.tsx`
**What it does (simple):**
The page you see when clicking a stock (e.g., /stock/AAPL). Shows price, chart, and community posts.

**What it does (technical):**
Dynamic route Server Component with generateMetadata for SEO.

**Why `[symbol]`?**
Square brackets make it dynamic - one file handles /stock/AAPL, /stock/TSLA, etc.

**How it works:**
```typescript
// params = { symbol: "AAPL" } from URL
export default async function StockPage({ params }) {
  const { symbol } = await params

  return (
    <>
      <StockStats symbol={symbol} />
      <StockChart symbol={symbol} />
      <StockPostsSection symbol={symbol} />
    </>
  )
}
```

**Why Server Component?**
- Can use `generateMetadata` (line 45)
- Sets page title: "AAPL Stock - StockTwits Clone"

**Connects to:**
- `components/stock/stock-stats.tsx`
- `components/stock/stock-chart.tsx`
- `components/stock/stock-posts-section.tsx`

---

### 📁 Components

#### `components/post/post-form.tsx`
**What it does (simple):**
The form where you type a post. Detects tickers as you type and shows them as badges.

**What it does (technical):**
Client Component with form state, validation, and API integration.

**Why Client Component?**
Uses React hooks (useState, useUser) for interactivity.

**Key features:**
1. **Real-time ticker detection** (line 43)
   ```typescript
   const detectedTickers = parseTickers(content)
   // As you type "$AAPL", shows badge immediately
   ```

2. **Character counter** (lines 46-48)
   ```typescript
   const remainingChars = MAX_CHARS - content.length
   // Shows "456/500" in different colors
   ```

3. **Sentiment selector** (lines 173-212)
   ```typescript
   <Button onClick={() => setSentiment("BULLISH")}>
     🟢 Bullish
   </Button>
   ```

4. **Form submission** (lines 51-98)
   ```typescript
   const handleSubmit = async (e) => {
     // Validate
     // POST to /api/posts
     // Clear form
     // Notify parent
   }
   ```

**Auth check:**
- If not loaded: Shows skeleton (lines 101-111)
- If not signed in: Shows "Sign in to create posts" (lines 115-124)

**Connects to:**
- `lib/parse-tickers.ts` - Ticker detection
- `app/api/posts/route.ts` - POST endpoint
- shadcn/ui components (Button, Textarea, Card, Badge)

---

#### `components/post/post-card.tsx`
**What it does (simple):**
Displays a single post - like a tweet card showing author, content, time, etc.

**What it does (technical):**
Presentational component rendering post data with author info and engagement metrics.

**Structure:**
```tsx
<Card>
  <Avatar + Username + Time />
  <Content (with clickable $TICKERS) />
  <Sentiment Badge />
  <Engagement (likes, comments) />
</Card>
```

**Clickable tickers:**
Uses `highlightTickers()` from lib/parse-tickers.ts to make $AAPL clickable.

**Connects to:**
- `lib/parse-tickers.ts` - Highlight tickers
- shadcn/ui components

---

#### `components/post/post-list.tsx`
**What it does (simple):**
Container that shows multiple PostCards, handles loading states and empty states.

**What it does (technical):**
Wrapper component with conditional rendering for different states.

**States:**
1. Loading: Shows skeleton cards
2. Error: Shows error message
3. Empty: Shows "No posts yet"
4. Success: Maps posts to PostCards

**Connects to:**
- `components/post/post-card.tsx`

---

#### `components/stock/stock-chart.tsx`
**What it does (simple):**
The line chart showing stock price over time.

**What it does (technical):**
Client Component fetching historical data and rendering with Recharts.

**Data flow:**
```typescript
useEffect(() => {
  fetch(`/api/stocks/${symbol}/history`)
    .then(data => setChartData(data))
}, [symbol])

return (
  <LineChart data={chartData}>
    <Line dataKey="close" stroke="#green" />
  </LineChart>
)
```

**Connects to:**
- `app/api/stocks/[symbol]/history/route.ts`
- recharts library

---

#### `components/stock/stock-stats.tsx`
**What it does (simple):**
Shows current stock price, change, high/low, etc.

**What it does (technical):**
Client Component fetching quote and displaying metrics.

**Displays:**
- Current price
- Price change (green if up, red if down)
- % change
- High/low
- Volume

**Connects to:**
- `app/api/stocks/[symbol]/route.ts`

---

#### `components/stock/stock-posts-section.tsx`
**What it does (simple):**
The "Community Posts" section on stock pages. Fetches and displays posts about that specific stock.

**What it does (technical):**
Client Component fetching filtered posts with ticker query parameter.

**Why separate component?**
The stock page is a Server Component (for SEO), but this needs client-side fetching/state.

**How it works:**
```typescript
// For /stock/AAPL
useEffect(() => {
  fetch(`/api/posts?ticker=AAPL`)
    .then(data => setPosts(data.posts))  // Notice: data.posts
}, [symbol])

return (
  <>
    <PostForm onPostCreated={refreshPosts} />
    <PostList posts={posts} />
  </>
)
```

**Connects to:**
- `app/api/posts/route.ts` with ticker filter
- `components/post/post-form.tsx`
- `components/post/post-list.tsx`

---

### 📁 Utilities (lib/)

#### `lib/parse-tickers.ts`
**What it does (simple):**
Magic function that finds stock symbols (like $AAPL) in text.

**What it does (technical):**
Regex-based ticker extraction with validation.

**Three main functions:**

1. **parseTickers(text)** - Extract tickers
```typescript
parseTickers("I love $AAPL and $TSLA!")
// Returns: ["AAPL", "TSLA"]

// How it works:
// 1. Regex: /\$([A-Za-z]{1,5})\b/gi
//    Finds $ followed by 1-5 letters
// 2. Converts to uppercase
// 3. Removes duplicates
```

2. **highlightTickers(text)** - Make clickable
```typescript
highlightTickers("Buying $AAPL")
// Returns JSX with <Link> tags
// Output: "Buying <Link href='/stock/AAPL'>$AAPL</Link>"
```

3. **isValidTicker(symbol)** - Validate
```typescript
isValidTicker("AAPL")    // true (1-5 letters)
isValidTicker("TOOLONG") // false (6 letters)
isValidTicker("A1")      // false (has number)
```

**Why these rules?**
- 1-5 letters: Most US stock tickers (AAPL, TSLA, F, GOOGL)
- Uppercase: Standardize (aapl → AAPL)
- No numbers: Avoid false positives like $10

**Connects to:**
- `components/post/post-form.tsx` - Real-time detection
- `components/post/post-card.tsx` - Clickable tickers
- `app/api/posts/route.ts` - Extract tickers on save

---

#### `lib/yahoo-finance.ts`
**What it does (simple):**
Wrapper around the yahoo-finance2 package that fetches stock data.

**What it does (technical):**
Singleton Yahoo Finance client with error handling and data formatting.

**Why wrapper?**
- Centralized error handling
- Consistent data format
- Easy to swap providers later

**Three main functions:**

1. **getStockQuote(symbol)**
```typescript
const quote = await getStockQuote("AAPL")
// Returns: { price, change, percentChange, high, low, volume }
```

2. **getHistoricalData(symbol)**
```typescript
const history = await getHistoricalData("AAPL")
// Returns: [{ date, open, high, low, close, volume }]
// Last 30 days by default
```

3. **searchStocks(query)**
```typescript
const results = await searchStocks("apple")
// Returns: [{ symbol: "AAPL", name: "Apple Inc." }]
```

**IMPORTANT: Instantiation**
```typescript
// v3.x requires this:
const yahooFinance = new YahooFinance()

// NOT just:
import yahooFinance from 'yahoo-finance2'
```

**Connects to:**
- `app/api/stocks/[symbol]/route.ts`
- `app/api/stocks/[symbol]/history/route.ts`

---

#### `lib/utils.ts`
**What it does (simple):**
Utility functions used throughout the app (mostly Tailwind class merging).

**What it does (technical):**
Helper functions, primarily `cn()` for conditional class names.

**Main function: cn()**
```typescript
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Usage:
<div className={cn(
  "base-class",
  isActive && "active-class",
  className
)} />
```

**Why?**
- `clsx`: Handles conditional classes
- `twMerge`: Resolves Tailwind conflicts (e.g., `p-4 p-8` → `p-8`)

**Connects to:**
- Almost all components use this

---

## Connection Map

### Database Relationships
```
┌──────────┐
│   User   │
│  id (PK) │
│ username │
│  email   │
└─────┬────┘
      │
      │ 1:N (One user, many posts)
      ▼
┌──────────┐
│   Post   │
│  id (PK) │
│ content  │
│sentiment │
│authorId  │──┐
└─────┬────┘  │
      │       │ References User.id
      │       │
      │ 1:N   │
      ▼       │
┌──────────┐  │
│PostTicker│  │
│  id (PK) │  │
│  symbol  │  │
│  postId  │──┘
└──────────┘
```

**Example data:**
```
User { id: "user_123", username: "john" }

Post {
  id: "post_456",
  content: "I love $AAPL and $TSLA!",
  authorId: "user_123"
}

PostTicker { symbol: "AAPL", postId: "post_456" }
PostTicker { symbol: "TSLA", postId: "post_456" }
```

### Component Hierarchy

```
app/layout.tsx (Root)
│
├─ app/page.tsx (Homepage)
│  ├─ PostForm
│  └─ PostList
│     └─ PostCard (multiple)
│
└─ app/stock/[symbol]/page.tsx (Stock Page)
   ├─ StockStats (fetches /api/stocks/AAPL)
   ├─ StockChart (fetches /api/stocks/AAPL/history)
   └─ StockPostsSection
      ├─ PostForm
      └─ PostList
         └─ PostCard (multiple)
```

### API Endpoint Map

| Endpoint | Method | Purpose | Returns |
|----------|--------|---------|---------|
| `/api/posts` | POST | Create post | Created post |
| `/api/posts` | GET | Fetch posts | `{ posts: [...] }` |
| `/api/posts?ticker=AAPL` | GET | Posts about $AAPL | `{ posts: [...] }` |
| `/api/stocks/AAPL` | GET | Current quote | Quote object |
| `/api/stocks/AAPL/history` | GET | Price history | Array of prices |
| `/api/webhooks/clerk` | POST | Clerk events | 200 OK |

### Import Dependency Graph

```
app/api/posts/route.ts
  ├─ imports lib/db.ts
  ├─ imports lib/parse-tickers.ts
  └─ imports @clerk/nextjs (auth, clerkClient)

components/post/post-form.tsx
  ├─ imports lib/parse-tickers.ts
  ├─ imports @clerk/nextjs (useUser)
  └─ imports components/ui/* (Button, Textarea, etc.)

app/stock/[symbol]/page.tsx
  ├─ imports components/stock/stock-stats.tsx
  ├─ imports components/stock/stock-chart.tsx
  └─ imports components/stock/stock-posts-section.tsx

components/stock/stock-posts-section.tsx
  ├─ imports components/post/post-form.tsx
  └─ imports components/post/post-list.tsx
```

---

## Common Patterns

### Pattern 1: Server Components vs Client Components

**Server Components** (default in Next.js 16)
```typescript
// NO "use client" directive
// app/page.tsx

export default async function HomePage() {
  // Can use async/await directly
  const data = await fetchData()

  return <div>{data}</div>
}
```

**Use when:**
- Don't need interactivity (no onClick, useState)
- Want to fetch data on server
- Need SEO (generateMetadata)

**Client Components**
```typescript
// HAS "use client" directive
"use client"

import { useState } from "react"

export function Counter() {
  const [count, setCount] = useState(0)

  return <button onClick={() => setCount(count + 1)}>
    {count}
  </button>
}
```

**Use when:**
- Need React hooks (useState, useEffect)
- Need event handlers (onClick, onChange)
- Need browser APIs (localStorage, window)

**Rule of thumb:**
- Pages: Server Components (for SEO)
- Interactive UI: Client Components
- Fetch data: Server when possible, Client when needed

---

### Pattern 2: API Route Structure

**Every API route follows this pattern:**

```typescript
// app/api/example/route.ts

export async function GET(req: NextRequest) {
  try {
    // 1. Parse request
    const { searchParams } = new URL(req.url)
    const param = searchParams.get('param')

    // 2. Validate/authenticate
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 3. Process (database query, external API, etc.)
    const data = await db.thing.findMany({ where: { ... } })

    // 4. Return response
    return NextResponse.json(data, { status: 200 })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
```

**Key points:**
1. Always wrap in try/catch
2. Return proper status codes (200, 401, 500)
3. Log errors with console.error
4. Return consistent JSON shape

---

### Pattern 3: Error Handling

**Frontend pattern:**
```typescript
const [error, setError] = useState<string | null>(null)
const [isLoading, setIsLoading] = useState(false)

try {
  setIsLoading(true)
  setError(null)

  const response = await fetch('/api/endpoint')

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || "Something went wrong")
  }

  const data = await response.json()
  // Success!

} catch (err) {
  setError(err instanceof Error ? err.message : "Unknown error")
} finally {
  setIsLoading(false)
}

// Show error in UI
{error && <div className="text-red-500">{error}</div>}
```

**Why instanceof Error?**
TypeScript doesn't know what type `catch` receives. Could be Error, string, or anything.

---

### Pattern 4: Type Safety with Prisma

**Database query:**
```typescript
const posts = await db.post.findMany({
  include: {
    author: true,
    tickers: true,
  }
})

// TypeScript knows the shape:
posts[0].author.username  // ✅ Type-safe
posts[0].author.email     // ✅ Type-safe
posts[0].randomField      // ❌ TypeScript error!
```

**Why this works:**
Prisma generates types from schema.prisma, so TypeScript knows exactly what fields exist.

---

### Pattern 5: Async/Await

**Good:**
```typescript
const fetchData = async () => {
  const response = await fetch('/api/data')
  const data = await response.json()
  return data
}
```

**Bad (Promise hell):**
```typescript
const fetchData = () => {
  return fetch('/api/data')
    .then(response => response.json())
    .then(data => data)
}
```

**Remember:**
- `async` function always returns a Promise
- `await` pauses execution until Promise resolves
- Can only use `await` inside `async` function

---

## Code Walkthroughs

### Walkthrough 1: "I want to create a post about $AAPL"

**Step-by-step file trace:**

**1. User types in form**
- **File:** `components/post/post-form.tsx:37-38`
- **What happens:**
  ```typescript
  const [content, setContent] = useState("")
  // User types: "I love $AAPL!"
  // onChange event updates state
  ```

**2. Ticker detected in real-time**
- **File:** `components/post/post-form.tsx:43`
- **What happens:**
  ```typescript
  const detectedTickers = parseTickers(content)
  ```
- **Calls:** `lib/parse-tickers.ts:27-47`
- **Returns:** `["AAPL"]`
- **UI shows:** Badge with "$AAPL" (line 161-164)

**3. User clicks "Post" button**
- **File:** `components/post/post-form.tsx:51`
- **What happens:** `handleSubmit()` runs

**4. Form validation**
- **File:** `components/post/post-form.tsx:55-63`
- **Checks:** Not empty, under 500 chars

**5. POST request sent**
- **File:** `components/post/post-form.tsx:69-78`
- **Request:**
  ```typescript
  fetch('/api/posts', {
    method: 'POST',
    body: JSON.stringify({
      content: "I love $AAPL!",
      sentiment: "BULLISH"
    })
  })
  ```

**6. API receives request**
- **File:** `app/api/posts/route.ts:30`
- **Handler:** `POST()` function starts

**7. Check authentication**
- **File:** `app/api/posts/route.ts:34`
- **What happens:**
  ```typescript
  const { userId } = await auth()
  // Returns userId from Clerk session cookie
  ```

**8. Ensure user exists in database**
- **File:** `app/api/posts/route.ts:47-60`
- **What happens:**
  ```typescript
  const clerkUser = await client.users.getUser(userId)
  await db.user.upsert({
    where: { id: userId },
    update: {},
    create: { id, username, email, name, imageUrl }
  })
  ```
- **Why:** New users might not be in DB yet if webhook hasn't fired

**9. Validate content**
- **File:** `app/api/posts/route.ts:66-96`
- **Checks:** Same as frontend (double validation is good!)

**10. Extract tickers from content**
- **File:** `app/api/posts/route.ts:100`
- **What happens:**
  ```typescript
  const tickers = parseTickers("I love $AAPL!")
  // Returns: ["AAPL"]
  ```

**11. Save to database**
- **File:** `app/api/posts/route.ts:105-139`
- **What happens:**
  ```typescript
  const post = await db.post.create({
    data: {
      content: "I love $AAPL!",
      sentiment: "BULLISH",
      authorId: userId,
      tickers: {
        createMany: {
          data: [{ symbol: "AAPL" }]
        }
      }
    },
    include: {
      author: true,
      tickers: true,
      _count: { select: { likes: true, comments: true } }
    }
  })
  ```
- **Creates TWO records:**
  1. Post record
  2. PostTicker record linking post to "AAPL"

**12. Return response**
- **File:** `app/api/posts/route.ts:142`
- **Returns:** Created post with author info

**13. Frontend receives response**
- **File:** `components/post/post-form.tsx:85-92`
- **What happens:**
  ```typescript
  // Clear form
  setContent("")
  setSentiment("NEUTRAL")

  // Notify parent to refresh
  onPostCreated()
  ```

**14. Parent refreshes feed**
- **File:** `app/page.tsx` or `components/stock/stock-posts-section.tsx`
- **What happens:** Calls GET /api/posts to fetch updated list
- **New post appears!**

---

### Walkthrough 2: "I want to see all posts about $TSLA"

**Step-by-step file trace:**

**1. User navigates to /stock/tsla**
- **File:** `app/stock/[symbol]/page.tsx:14`
- **What happens:**
  ```typescript
  const { symbol } = await params  // "tsla"
  const upperSymbol = symbol.toUpperCase()  // "TSLA"
  ```

**2. Page renders three sections**
- **File:** `app/stock/[symbol]/page.tsx:24-39`
- **Renders:**
  1. `<StockStats symbol="TSLA" />`
  2. `<StockChart symbol="TSLA" />`
  3. `<StockPostsSection symbol="TSLA" />`

**3. StockPostsSection mounts**
- **File:** `components/stock/stock-posts-section.tsx:30`
- **What happens:** `useEffect` runs

**4. Fetch posts filtered by ticker**
- **File:** `components/stock/stock-posts-section.tsx:32-35`
- **Request:**
  ```typescript
  fetch('/api/posts?ticker=TSLA')
  ```

**5. API receives request**
- **File:** `app/api/posts/route.ts:172`
- **Handler:** `GET()` function starts

**6. Parse query parameters**
- **File:** `app/api/posts/route.ts:175-177`
- **What happens:**
  ```typescript
  const ticker = searchParams.get('ticker')  // "TSLA"
  ```

**7. Build database filter**
- **File:** `app/api/posts/route.ts:197-202`
- **What happens:**
  ```typescript
  where.tickers = {
    some: {
      symbol: "TSLA"
    }
  }
  ```
- **Translation:** "Find posts that have at least one PostTicker with symbol='TSLA'"

**8. Query database**
- **File:** `app/api/posts/route.ts:218-249`
- **SQL equivalent:**
  ```sql
  SELECT posts.*, users.*
  FROM posts
  JOIN post_tickers ON posts.id = post_tickers.post_id
  JOIN users ON posts.author_id = users.id
  WHERE post_tickers.symbol = 'TSLA'
  ORDER BY posts.created_at DESC
  LIMIT 20
  ```

**9. Return filtered posts**
- **File:** `app/api/posts/route.ts:234`
- **Returns:**
  ```json
  {
    "posts": [
      {
        "id": "...",
        "content": "TSLA to the moon!",
        "sentiment": "BULLISH",
        "author": { "username": "john" },
        "tickers": [{ "symbol": "TSLA" }]
      }
    ]
  }
  ```

**10. Frontend receives data**
- **File:** `components/stock/stock-posts-section.tsx:37-38`
- **What happens:**
  ```typescript
  const data = await response.json()
  setPosts(data.posts)  // Updates state
  ```

**11. PostList renders**
- **File:** `components/post/post-list.tsx:20`
- **Maps over posts:**
  ```typescript
  {posts.map(post => (
    <PostCard key={post.id} post={post} />
  ))}
  ```

**12. User sees posts about $TSLA!**

---

### Walkthrough 3: "A new user signs up"

**Two possible flows:**

**Flow A: Webhook is set up (Ideal)**

**1. User signs up via Clerk**
- **Location:** Clerk-hosted sign-up page or embedded component

**2. Clerk creates user**
- **Happens:** In Clerk's database

**3. Clerk sends webhook**
- **Calls:** POST https://yourapp.com/api/webhooks/clerk
- **Event type:** `user.created`
- **Payload:**
  ```json
  {
    "type": "user.created",
    "data": {
      "id": "user_abc123",
      "email_addresses": [{ "email_address": "john@example.com" }],
      "username": "john",
      "first_name": "John",
      "last_name": "Doe",
      "image_url": "https://..."
    }
  }
  ```

**4. Webhook handler receives request**
- **File:** `app/api/webhooks/clerk/route.ts:18`

**5. Verify signature**
- **File:** `app/api/webhooks/clerk/route.ts:25-27`
- **What happens:** Svix verifies request came from Clerk
- **Why:** Prevent fake/malicious requests

**6. Parse event type**
- **File:** `app/api/webhooks/clerk/route.ts:29-31`
- **Determines:** user.created

**7. Create user in database**
- **File:** `app/api/webhooks/clerk/route.ts:35-47`
- **What happens:**
  ```typescript
  await db.user.create({
    data: {
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0].emailAddress,
      username: clerkUser.username || clerkUser.id,
      name: `${clerkUser.firstName} ${clerkUser.lastName}`,
      imageUrl: clerkUser.imageUrl
    }
  })
  ```

**8. Return success**
- **File:** `app/api/webhooks/clerk/route.ts:85`

**Flow B: Webhook NOT set up (Fallback)**

**1-2. Same** (User signs up, Clerk creates user)

**3. User tries to create first post**
- **File:** `components/post/post-form.tsx:69-78`
- **POST to /api/posts**

**4. API checks user exists**
- **File:** `app/api/posts/route.ts:47-60`
- **What happens:**
  ```typescript
  const clerkUser = await client.users.getUser(userId)

  await db.user.upsert({
    where: { id: userId },
    update: {},  // Already exists? Do nothing
    create: { /* create user */ }  // New user? Create them!
  })
  ```

**5. User is now in database**
- **Post creation continues normally**

**Why both flows?**
- Webhook is faster (user created immediately)
- Fallback ensures app works even if webhook fails/isn't configured

---

## Quick Reference

### Common Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Build for production
npm run start            # Start production server

# Database
npx prisma studio        # Open database GUI
npx prisma migrate dev   # Create new migration
npx prisma generate      # Generate Prisma types
npx prisma db push       # Quick schema sync (no migration)

# Linting
npm run lint             # Run ESLint
```

### Where to Find Things

**API Endpoints?**
- `app/api/*/route.ts` files

**Pages?**
- `app/page.tsx` (homepage)
- `app/stock/[symbol]/page.tsx` (stock pages)

**Components?**
- `components/post/*` - Post-related UI
- `components/stock/*` - Stock-related UI
- `components/ui/*` - shadcn/ui components (don't edit)

**Database Schema?**
- `prisma/schema.prisma`

**Utilities?**
- `lib/*.ts` files

**Configuration?**
- `next.config.ts` - Next.js
- `tsconfig.json` - TypeScript
- `middleware.ts` - Auth protection
- `package.json` - Dependencies

### Debugging Tips

**Posts not showing on stock page?**
1. Check browser DevTools Network tab
2. Look at GET /api/posts?ticker=AAPL request
3. Check response - is `data.posts` present?
4. Check database: `npx prisma studio` → PostTicker table
5. Are there PostTicker records with that symbol?

**Stock chart not loading?**
1. Check GET /api/stocks/AAPL/history in Network tab
2. Look at response - any errors?
3. Check terminal for server errors
4. Is `runtime = "nodejs"` set in route.ts?

**User can't create posts?**
1. Are they logged in? Check Clerk session
2. Check POST /api/posts request in Network tab
3. Look at response - what error?
4. Check if user exists in database (Prisma Studio)

**Database changes not working?**
1. Did you run `npx prisma migrate dev`?
2. Did you run `npx prisma generate`?
3. Restart dev server (Next.js caches Prisma client)

**TypeScript errors?**
1. Restart VS Code TypeScript server (Cmd+Shift+P → "TypeScript: Restart TS Server")
2. Check `tsconfig.json` paths are correct
3. Run `npm install` (might be missing types)

### Environment Variables

Create `.env` file (never commit this!):
```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL=postgresql://user:password@host/db

# Gemini (Phase 4)
GEMINI_API_KEY=AIza...
```

**Where to get these:**
- Clerk keys: dashboard.clerk.com → API Keys
- Database URL: neon.tech → Connection string
- Gemini key: ai.google.dev → Get API Key

### Common Errors & Solutions

**"Prisma Client not generated"**
```bash
npx prisma generate
```

**"Module not found: @/lib/db"**
- Check `tsconfig.json` has `paths` configured
- Restart dev server

**"Cannot read property 'posts' of undefined"**
- API returning wrong format
- Check response is `{ posts: [...] }` not `[...]`

**"Edge Runtime doesn't support..."**
- Add `export const runtime = "nodejs"` to route.ts

**"Webhook signature verification failed"**
- Check CLERK_WEBHOOK_SECRET is set
- Check Clerk dashboard webhook URL is correct

---

## Next Steps

**You've learned:**
✅ How the entire app works (Big Picture)
✅ How data flows from UI → API → Database
✅ What every file does (and why)
✅ How files connect together
✅ Common patterns used throughout
✅ Step-by-step traces of user actions

**To continue learning:**

1. **Try modifying something small:**
   - Change post character limit from 500 to 1000
   - Add a new sentiment option ("UNCERTAIN")
   - Change color theme

2. **Implement a new feature:**
   - Phase 4: LLM Integration (Gemini analysis)
   - Phase 5: Likes/Comments
   - User profiles

3. **Read the actual files:**
   - Start with `lib/parse-tickers.ts` (simplest)
   - Then `app/api/posts/route.ts` (core logic)
   - Finally `components/post/post-form.tsx` (complex state)

4. **Experiment:**
   - Add console.log() statements
   - Use Prisma Studio to inspect database
   - Use browser DevTools to watch Network requests

**Remember:**
- Reading code is a skill - gets easier with practice
- Don't try to understand everything at once
- Focus on tracing one user action at a time
- Use the debugger (VS Code + Chrome DevTools)

**Questions to ask yourself:**
- "What happens if I change this line?"
- "Where does this function get called?"
- "What would break if I removed this?"
- "Why did they do it this way instead of X?"

---

**You're now ready to confidently work with this codebase. Happy coding!** 🚀

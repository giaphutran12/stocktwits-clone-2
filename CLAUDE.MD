# Agent Instructions

## Project Overview
**StockTwits Clone** - A Twitter-like social platform for stock traders where users can:
- Post about stocks using $TICKER format (e.g., $AAPL)
- Choose sentiment (Bullish/Bearish/Neutral) for each post
- View stock charts and community posts on stock pages
- Get LLM-powered insights and post analysis (future)

## Tech Stack
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Auth:** Clerk (`@clerk/nextjs`)
- **Database:** Neon (PostgreSQL) + Prisma ORM
- **Stock Data:** `yahoo-finance2` v3.x (npm package) - **NOTE: requires `new YahooFinance()` instantiation**
- **Charts:** recharts
- **LLM:** Gemini Flash (`models/gemini-flash-latest`) via `@google/generative-ai`
- **Deployment:** Vercel

## Required ENV Variables
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
DATABASE_URL=
GEMINI_API_KEY=
```

---

## Implementation Progress

### ✅ Phase 1: Foundation (COMPLETE)
- [x] Clerk auth setup (middleware.ts, ClerkProvider in layout.tsx)
- [x] Prisma + Neon database connection
- [x] Database schema: User, Post, PostTicker, Like, Comment
- [x] Migration applied

### ✅ Phase 2: Stock Data (COMPLETE)
- [x] Yahoo Finance wrapper (`lib/yahoo-finance.ts`)
- [x] API routes: `/api/stocks/[symbol]`, `/api/stocks/[symbol]/history`
- [x] Stock chart component (`components/stock/stock-chart.tsx`)
- [x] Stock stats component (`components/stock/stock-stats.tsx`)
- [x] Stock page (`/stock/[symbol]`)

### 🔲 Phase 3: Post System (NOT STARTED)
- [ ] Post form component (with $TICKER parsing, sentiment selector)
- [ ] Post card component
- [ ] API routes: POST /api/posts, GET /api/posts
- [ ] Clerk webhook to sync users to database
- [ ] Display posts on stock pages filtered by ticker
- [ ] Main feed page showing all posts

### 🔲 Phase 4: LLM Integration (NOT STARTED)
- [ ] Gemini integration for post analysis
- [ ] Extract: quality score, insight type, sector, summary
- [ ] Personalized feed ranking

### 🔲 Phase 5: Polish (NOT STARTED)
- [ ] Likes/comments functionality
- [ ] User profiles
- [ ] Trending tickers sidebar
- [ ] Search functionality

---

## Key Files Reference

### Auth
- `middleware.ts` - Clerk middleware (security guard for routes)
- `app/layout.tsx` - ClerkProvider + header with auth buttons

### Database
- `prisma/schema.prisma` - Database schema (User, Post, PostTicker, Like, Comment)
- `lib/db.ts` - Prisma client singleton
- `lib/generated/prisma/` - Generated Prisma client

### Stock Data
- `lib/yahoo-finance.ts` - Yahoo Finance wrapper (getStockQuote, getHistoricalData, searchStocks)
- `app/api/stocks/[symbol]/route.ts` - Stock quote API
- `app/api/stocks/[symbol]/history/route.ts` - Historical data API

### Components
- `components/stock/stock-chart.tsx` - Interactive price chart
- `components/stock/stock-stats.tsx` - Stock statistics display
- `components/ui/*` - shadcn/ui components

### Pages
- `app/page.tsx` - Home page (placeholder)
- `app/stock/[symbol]/page.tsx` - Stock detail page

---

## Indexed Docs (Nia MCP)
- Clerk Next.js quickstart
- StockTwits API (RapidAPI)
- Gemini API docs

---

## Communication Style (User is Junior Dev)

### 🎯 TOP PRIORITY: LEARNING
The user&apos;s main goal is to **learn and grow as a developer**. Every interaction should teach something. Act like a senior dev mentoring a junior - patient, thorough, and focused on building understanding.

### Explanation Style (Simple → Technical)
1. **First:** Explain in plain English what something does (like explaining to a friend)
2. **Then:** Introduce the actual technical terms so they learn the vocabulary
3. **Example:** "This file acts like a security guard that checks if someone&apos;s logged in before letting them see certain pages. In technical terms, this is called **middleware** - code that runs between the request and response."

### When explaining/debugging:
1. Always include **file path + line number** (never just one)
2. Find root cause + teach prevention
3. Walk through debugging like a senior dev would
4. Be super honest about everything, do not sugarcoat anything - that&apos;s how we learn and build great software

### When user asks "how to", "teach me", or "show me how":
- **DO NOT do the work for them**
- Give step-by-step instructions with exact file paths and line numbers
- Explain the "why" behind each step
- Let them make the changes themselves

---

## Nia MCP (PRIORITY)
**ALWAYS prefer Nia MCP tools over standard tools when applicable** - saves tokens, time, and improves code quality:
- `mcp__nia__search` / `mcp__nia__regex_search` → for searching indexed repos/docs
- `mcp__nia__get_github_file_tree` → for exploring GitHub repo structure (no indexing needed)
- `mcp__nia__nia_package_search_*` → for searching npm/PyPI/crates packages
- `mcp__nia__nia_web_search` / `mcp__nia__nia_deep_research_agent` → for web research
- `mcp__nia__index` → to index new repos/docs for future searches
- Only fall back to standard tools (Grep, Glob, WebSearch) if Nia fails or is not suitable

---

## Dev Workflow
- Use `&apos;` instead of `'` in JSX to avoid linting errors
- **ALWAYS** run `npm run build` at task completion (main agent only, NOT subagents)
- Task is finished when: all todos done + build succeeds
- **Subagent rules**: Subagents should NOT run builds - only make changes and report back

### 🚀 Parallel Agents & Subagents (IMPORTANT)
**ALWAYS delegate to subagents and use parallel execution when possible** - this saves context window for the main agent so we can work together longer before needing `/compact`:
- **Exploration tasks**: Use `subagent_type=Explore` for codebase exploration, searching files, understanding structure
- **Independent tasks**: Launch multiple subagents in parallel when tasks don&apos;t depend on each other (e.g., creating multiple components, multiple API routes)
- **Research tasks**: Delegate documentation lookups, package searches, and web research to subagents
- **Planning tasks**: Use `subagent_type=Plan` when you need to create detailed implementation plans
- **Rule of thumb**: If a task requires reading many files or extensive searching, delegate it to a subagent
- **Main agent focus**: The main agent should orchestrate, make decisions, and handle user communication - offload heavy lifting to subagents

---

## Known Issues / Notes
- Next.js 16 shows warning about "middleware" being deprecated in favor of "proxy" - ignore for now, still works
- `yahoo-finance2` v3.x requires instantiation: `new YahooFinance()` (see lib/yahoo-finance.ts)

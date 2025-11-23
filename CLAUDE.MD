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

### ✅ Phase 3: Post System (COMPLETE)
- [x] Post form component (with $TICKER parsing, sentiment selector) - `components/post/post-form.tsx`
- [x] Post card component - `components/post/post-card.tsx`
- [x] Post list component - `components/post/post-list.tsx`
- [x] Parse-tickers utility function - `lib/parse-tickers.ts`
- [x] API routes: POST /api/posts, GET /api/posts - `app/api/posts/route.ts`
- [x] Clerk webhook to sync users to database - `app/api/webhooks/clerk/route.ts`
- [x] Inline user sync fallback in POST /api/posts (upsert logic using clerkClient)
- [x] Display posts on stock pages filtered by ticker - `components/stock/stock-posts-section.tsx`
- [x] Main feed page showing all posts - `app/page.tsx`
- [x] **Production fixes:**
  - [x] Added `postinstall: "prisma generate"` to package.json
  - [x] Added `runtime = "nodejs"` to stock API routes for yahoo-finance2 compatibility
  - [x] Installed `svix` package for webhook verification

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

### Posts
- `lib/parse-tickers.ts` - Utility functions (parseTickers, highlightTickers, isValidTicker)
- `components/post/post-form.tsx` - Post creation form with sentiment + ticker detection
- `components/post/post-card.tsx` - Post display component
- `components/post/post-list.tsx` - Post list wrapper with loading/error states
- `app/api/posts/route.ts` - POST (create) and GET (fetch) posts endpoints
- `app/api/webhooks/clerk/route.ts` - Clerk webhook handler for user sync

### Components
- `components/stock/stock-chart.tsx` - Interactive price chart
- `components/stock/stock-stats.tsx` - Stock statistics display
- `components/stock/stock-posts-section.tsx` - Client component for stock page posts (filtered by ticker)
- `components/ui/*` - shadcn/ui components

### Pages
- `app/page.tsx` - Home page (main feed with all posts)
- `app/stock/[symbol]/page.tsx` - Stock detail page (chart + stats + posts)

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

### 🔒 SECURITY - PRE-COMMIT CHECKLIST (CRITICAL)
**BEFORE EVERY COMMIT, YOU MUST:**
1. **Review EVERY file being committed** - Check `git diff` output
2. **Scan for secrets/credentials:**
   - API keys (starts with `pk_`, `sk_`, `AIza`, etc.)
   - Database URLs (contains passwords or connection strings)
   - Webhook secrets (starts with `whsec_`)
   - Email addresses
   - Any hardcoded passwords or tokens
3. **NEVER commit these file types with secrets:**
   - Documentation files (.md, .txt) with example credentials
   - Debug/log files with API responses
   - Config files with real values instead of placeholders
   - Database dumps or exports
4. **Use placeholders in docs:**
   - ❌ WRONG: `CLERK_SECRET_KEY=sk_test_abc123xyz`
   - ✅ RIGHT: `CLERK_SECRET_KEY=sk_test_your_key_here`
5. **If secrets are accidentally committed:**
   - Immediately revert the commit
   - Rotate ALL exposed credentials
   - Use `git filter-branch` or BFG to remove from history
   - Force push to overwrite remote

**Remember:** Once pushed to GitHub, secrets are compromised FOREVER (even after deletion)

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

### Production Deployment Issues (RESOLVED)
1. **Stock APIs returning 404**: Fixed by adding `runtime = "nodejs"` to stock API routes (yahoo-finance2 requires Node.js runtime, not Edge)
2. **Prisma Client not found**: Fixed by adding `"postinstall": "prisma generate"` to package.json
3. **New users cannot post**: Fixed by adding inline user sync using clerkClient in POST /api/posts (fallback when webhook isn't set up)

### Security Incident (CRITICAL LEARNING)
- **NEVER commit credentials/API keys** - Even if deleted, they remain in git history
- User must rotate ALL credentials after accidental exposure (Clerk, Database URL, Gemini API key, Webhook secret)
- Always review `git diff` before committing - check for secrets in .md files, debug guides, or config files
- Use placeholders in documentation: `CLERK_SECRET_KEY=sk_test_your_key_here` NOT real keys

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
- **LLM:** Anthropic Claude (`claude-sonnet-4-20250514`) via `@anthropic-ai/sdk`
- **Background Jobs:** Inngest (reliable serverless job queue)
- **Deployment:** Vercel

## Required ENV Variables
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
DATABASE_URL=
ANTHROPIC_API_KEY=
INNGEST_SIGNING_KEY=  # Required for production (get from Inngest dashboard)
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

### ✅ Phase 4: LLM Integration (COMPLETE)
- [x] Gemini integration for post analysis - `lib/gemini.ts`
- [x] Extract: quality score, insight type, sector, summary
- [x] Inngest background job queue - `lib/inngest.ts`, `lib/inngest/functions.ts`
- [x] API route for Inngest - `app/api/inngest/route.ts`
- [x] Quality-based feed sorting with Top/Recent toggle
- [x] AI analysis UI in post cards (stars, badges, summary)

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
- `components/post/post-card.tsx` - Post display component (with AI analysis section)
- `components/post/post-list.tsx` - Post list wrapper with loading/error states
- `app/api/posts/route.ts` - POST (create with Inngest event) and GET (fetch with sort) endpoints
- `app/api/posts/[id]/analyze/route.ts` - POST endpoint to analyze a post with Gemini
- `app/api/webhooks/clerk/route.ts` - Clerk webhook handler for user sync

### LLM & Background Jobs
- `lib/anthropic.ts` - Anthropic Claude service (analyzePost with system prompt)
- `lib/inngest.ts` - Inngest client configuration
- `lib/inngest/functions.ts` - Background job functions (analyze-post)
- `app/api/inngest/route.ts` - Inngest webhook handler (GET, POST, PUT)
- `components/feed/feed-toggle.tsx` - Toggle between "Top" (quality sorted) and "Recent" posts

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
- Inngest docs (ID: 0fe20a57-1de1-4c14-8153-0e5c2ecb1660)

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
Package Search (No indexing!)
nia_package_search_grep - Regex-based code search in 3,000+ packages
nia_package_search_hybrid - AI-powered semantic package search
nia_package_search_read_file - Read specific file sections
Supports: PyPI, NPM, Crates.io, Go modules
Universal Indexing
index - Universal indexing tool (auto-detects repos or docs from URL)
get_github_file_tree - Get GitHub file structure without indexing
Repository Search
search_codebase - AI-powered natural language code search
regex_search - Regex pattern search over indexed repositories
Documentation Search
search_documentation - Search indexed docs with natural language
Resource Management
manage_resource - Unified tool for all resource operations (list, status, rename, delete)
Web Search & Research
nia_web_search - AI-powered search for repos, docs, and content
nia_deep_research_agent - Deep multi-step research and analysis
Context Management
context - Unified context management (save, list, retrieve, search, update, delete)
Development Tools
read_source_content - Read full content of specific sources
nia_bug_report - Submit feedback directly to the development team
Action: save
Save conversation with title, summary, content, tags, and edited files
Action: list
List saved contexts with filtering (workspace, directory, file overlap)
Action: retrieve
Pull full context by ID
Action: search
Search by keyword across title, summary, content, and tags
Action: update
Update title, summary, content, tags, or metadata
Action: delete
Remove contexts when done
Tips & Tricks
Tips on how to use Nia and some tricks
 When using Nia search
Ask your agent to use Nia as many times as you want and also leverage the read_source_content tool because each search tool outputs links where it found information from. Then the read_source_content tool can pick up those links and check the whole webpage or GitHub file to get the entire content if needed.
​
2. Use package search when you need information about any package
Enable your AI agents to search the source code of your package dependencies.
Grep Search
Execute grep across the source code of a public package
Hybrid Search
Search package source using regex or semantic understanding
File Reading
Read exact lines from a source file
Example queries:
In numpy, what environment variables or compile-time flags switch kernels, and how do you plug in a custom inner loop?
How do I stream responses with AI SDK? Use package search.
Search PostHog and tell me how do they handle analytics and usage monitoring.
​
3. When you start a new chat with an agent
Ask it to list docs/repos first so it can output everything you have indexed, otherwise it won’t have enough context about what it has.

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

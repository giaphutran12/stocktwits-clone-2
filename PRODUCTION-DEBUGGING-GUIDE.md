# Production Deployment Debugging Guide
## StockTwits Clone - Vercel Deployment Issues

---

## Overview of Issues

You have 3 production bugs on Vercel:
1. **Stock chart/stats don't work** - Charts won't load, stock data missing
2. **New user posting fails** - Users who never logged in on localhost can't post
3. **Existing users can post fine** - Users who were created locally work perfectly

Let's debug each one step by step.

---

## Issue #1: Stock Chart/Stats Not Working

### What's Happening
When you visit `/stock/AAPL` in production, the chart and stats either:
- Show "Loading chart..." forever
- Show an error message
- Display blank/broken sections

### Most Likely Causes

#### 1. Yahoo Finance API Timeout (95% chance this is it)
**What this means:** Vercel serverless functions have a **10-second timeout** by default. Yahoo Finance can sometimes be slow, especially for historical data. If it takes longer than 10 seconds, Vercel kills the request.

**How to check:**
- Open your browser's **DevTools** (F12)
- Go to the **Network** tab
- Visit `/stock/AAPL`
- Look for failed requests to `/api/stocks/AAPL/history`
- Click on it and check if you see:
  - Status: `504 Gateway Timeout`
  - Or Status: `500 Internal Server Error`

#### 2. Yahoo Finance Package Not Installed
**What this means:** The `yahoo-finance2` npm package might not be in production dependencies.

**How to check:**
```bash
# Look at your package.json
cat package.json | grep yahoo-finance2
```

Make sure it's under `"dependencies"` (NOT `"devDependencies"`):
```json
{
  "dependencies": {
    "yahoo-finance2": "^3.0.0"  // ← Should be here
  }
}
```

#### 3. Missing Environment Variables
**What this means:** Although Yahoo Finance doesn't need API keys, other parts of your app might be breaking and causing cascade failures.

### How to Debug

#### Step 1: Check Vercel Function Logs
This is like reading the "error messages" from your production server.

1. Go to [Vercel Dashboard](https://vercel.com/)
2. Click on your **stocktwits-clone-2** project
3. Click the **Deployments** tab
4. Click on your latest deployment (the one at the top)
5. Click **Functions** tab
6. Look for `/api/stocks/[symbol]/route` and `/api/stocks/[symbol]/history/route`
7. Click on them to see error logs

**What to look for:**
```
Error: Timeout of 10000ms exceeded
```
Or:
```
Cannot find module 'yahoo-finance2'
```

#### Step 2: Add Debug Console Logs
Let's add logging to see exactly where it breaks.

**File:** `/Users/edwardtran/Library/CloudStorage/OneDrive-VEYMCA/fullstack projects/new fullstack projects/stocktwits-clone-2/app/api/stocks/[symbol]/route.ts`

**Add this at line 22 (right after `const quote = await getStockQuote(symbol);`):**
```typescript
console.log('[Stock API] Successfully fetched quote for:', symbol, quote);
```

**Add this at line 34 (inside the catch block):**
```typescript
console.error('[Stock API] Error details:', {
  symbol,
  errorMessage: error instanceof Error ? error.message : 'Unknown error',
  errorStack: error instanceof Error ? error.stack : undefined
});
```

**File:** `/Users/edwardtran/Library/CloudStorage/OneDrive-VEYMCA/fullstack projects/new fullstack projects/stocktwits-clone-2/app/api/stocks/[symbol]/history/route.ts`

**Add this at line 36 (right after `const data = await getHistoricalData(symbol, range);`):**
```typescript
console.log('[History API] Successfully fetched history for:', symbol, 'range:', range, 'dataPoints:', data.length);
```

**Add this at line 51 (inside the catch block):**
```typescript
console.error('[History API] Error details:', {
  symbol,
  range,
  errorMessage: error instanceof Error ? error.message : 'Unknown error',
  errorStack: error instanceof Error ? error.stack : undefined
});
```

**File:** `/Users/edwardtran/Library/CloudStorage/OneDrive-VEYMCA/fullstack projects/new fullstack projects/stocktwits-clone-2/lib/yahoo-finance.ts`

**Add this at line 77 (inside the catch block of `getStockQuote`):**
```typescript
console.error('[Yahoo Finance] getStockQuote failed:', {
  symbol,
  errorName: error instanceof Error ? error.name : 'Unknown',
  errorMessage: error instanceof Error ? error.message : String(error)
});
```

**Add this at line 115 (inside the catch block of `getHistoricalData`):**
```typescript
console.error('[Yahoo Finance] getHistoricalData failed:', {
  symbol,
  range,
  errorName: error instanceof Error ? error.name : 'Unknown',
  errorMessage: error instanceof Error ? error.message : String(error)
});
```

#### Step 3: Test in Browser Console
After deploying with the logs above:

1. Open your production site: `https://your-app.vercel.app/stock/AAPL`
2. Open DevTools (F12) → **Console** tab
3. Watch for error messages
4. Open **Network** tab
5. Click on failed API requests to see response

### Potential Fixes

#### Fix #1: Increase Vercel Function Timeout
**What this does:** Gives Yahoo Finance more time to respond.

1. Create a file called `vercel.json` in your project root:
   ```json
   {
     "functions": {
       "app/api/**/*.ts": {
         "maxDuration": 30
       }
     }
   }
   ```
2. This gives API routes **30 seconds** instead of 10
3. Commit and push to trigger new deployment

**Note:** Free tier Vercel has a 10-second limit. Pro tier allows up to 60 seconds.

#### Fix #2: Add Retry Logic
**What this does:** If Yahoo Finance fails once, try again.

This is more advanced - ask me if you want to implement this.

#### Fix #3: Cache Stock Data
**What this does:** Store Yahoo Finance responses temporarily so you don't fetch every time.

This is more advanced - ask me if you want to implement this.

---

## Issue #2: New User Posting Fails

### What's Happening
- Users who logged in on **localhost first** → Can post in production ✅
- Users who logged in **directly on production** → Cannot post ❌

### Root Cause Analysis

**The Problem:** Look at this code in `/app/api/posts/route.ts` (lines 47-60):

```typescript
const client = await clerkClient();
const clerkUser = await client.users.getUser(userId);
```

This code **fetches user data from Clerk's API**. To do this, it needs your `CLERK_SECRET_KEY` environment variable.

**Why it works for existing users:**
- User already exists in your database (created when you tested on localhost)
- The `upsert()` finds them and doesn't need to call Clerk
- No Clerk API call = no need for `CLERK_SECRET_KEY`

**Why it fails for new users:**
- User doesn't exist in database yet
- Code tries to fetch from Clerk API with `client.users.getUser(userId)`
- Clerk API says: "No `CLERK_SECRET_KEY`? Access denied!"
- Error thrown → Post creation fails

### How to Verify the Issue

#### Check Vercel Logs
1. Go to Vercel Dashboard → Your Project → Functions
2. Find `/api/posts/route` in the list
3. Look for errors like:
   ```
   ClerkAPIError: Authentication invalid
   ```
   Or:
   ```
   Missing CLERK_SECRET_KEY
   ```

#### Check Browser Console
1. Open production site
2. Try to create a post as a new user
3. Open DevTools → Network tab
4. Look at the POST request to `/api/posts`
5. Check the response - you'll probably see `500 Internal Server Error`

### The Fix: Add Missing Environment Variables

Your `.env` file has all the variables, but **Vercel doesn't know about them**. Environment variables are **per-environment** - localhost and production are separate.

**Environment variables in `.env` are ONLY for localhost**. They don't automatically sync to Vercel.

#### Step-by-Step: Add Env Vars to Vercel

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com/)
   - Click on your **stocktwits-clone-2** project

2. **Navigate to Settings**
   - Click the **Settings** tab (top navigation)
   - Click **Environment Variables** in the left sidebar

3. **Add Each Variable**
   For each variable below, click **Add New**:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_Z2xhZC1mb2FsLTM0LmNsZXJrLmFjY291bnRzLmRldiQ` | Production, Preview, Development |
   | `CLERK_SECRET_KEY` | `sk_test_eHGspIf5bR198xTr9TI6mEMqgM4m2DtPimtB0jEn2P` | Production, Preview, Development |
   | `DATABASE_URL` | `postgresql://neondb_owner:npg_RI9epnNWTma1@ep-damp-fog-adigvw62-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` | Production, Preview, Development |
   | `GEMINI_API_KEY` | `AIzaSyAPEbb-5stiiO9flD35u6rUhsueV3k6QCQ` | Production, Preview, Development |
   | `CLERK_WEBHOOK_SECRET` | `whsec_JvNy/Q7jZdrii0qbb5LOTFK9i+QmsxWY` | Production, Preview, Development |

   **Important:** For each variable:
   - Paste the **exact value** from your `.env` file
   - Check **all three checkboxes**: Production, Preview, Development
   - Click **Save**

4. **Redeploy Your App**
   - After adding all variables, go to **Deployments** tab
   - Click the **3 dots** (•••) on your latest deployment
   - Click **Redeploy**
   - Or just push a new commit to trigger deployment

#### Verify Environment Variables Are Set

After deployment completes:

1. Go to **Deployments** → Click latest deployment
2. Scroll down to **Environment Variables**
3. You should see all 5 variables listed (values are hidden for security)

**If you don't see them:**
- Go back to Settings → Environment Variables
- Make sure you checked the **Production** checkbox for each one

---

## Issue #3: Existing Users Can Post Fine

### Why This Works

Users who logged in on localhost first have a database record that looks like this:

```sql
User {
  id: "user_abc123",
  email: "you@example.com",
  username: "yourname",
  name: "Your Name",
  imageUrl: "https://...",
  createdAt: "2024-01-15T..."
}
```

When they post in production, this code runs:

```typescript
await db.user.upsert({
  where: { id: userId },  // ← Finds the existing user
  update: {},              // ← Does nothing (empty update)
  create: { ... }          // ← Never runs because user exists
});
```

The `upsert` finds them immediately (from your Neon database) and skips the Clerk API call entirely.

**This is actually good!** It means your database connection is working perfectly. The only issue is with new users who need the Clerk API.

---

## Environment Variables Setup Checklist

Use this checklist every time you deploy to Vercel:

### Before Deploying

- [ ] All env vars are in `.env` file locally
- [ ] App works on localhost (test posting, stock pages, etc.)
- [ ] Run `npm run build` successfully with no errors

### During Deployment

- [ ] Copy each env var from `.env` to Vercel Dashboard
- [ ] Check all three environment checkboxes (Production, Preview, Development)
- [ ] Double-check there are no typos in variable names or values
- [ ] Click Save for each variable

### After Deployment

- [ ] Visit Vercel Dashboard → Latest Deployment → Environment Variables
- [ ] Verify all 5 variables are listed
- [ ] Test the app in production
- [ ] Check Vercel Function Logs for any errors

### Common Mistakes to Avoid

❌ **Copying `.env` with spaces**
```bash
# WRONG
CLERK_SECRET_KEY= sk_test_abc123  # ← Extra space after =

# RIGHT
CLERK_SECRET_KEY=sk_test_abc123
```

❌ **Forgetting to check environment checkboxes**
- If you only check "Production", Preview deployments will fail
- **Always check all three** unless you have a specific reason not to

❌ **Using different values in Vercel than localhost**
- Your localhost `.env` and Vercel should have the **same values**
- If they're different, you'll get weird bugs that only happen in production

---

## Testing Checklist

After fixing the issues, test these scenarios:

### Test 1: Stock Pages Work

1. **Visit a stock page**
   - Go to `https://your-app.vercel.app/stock/AAPL`
   - Expected: Chart loads within 5 seconds
   - Expected: Price, volume, and stats display correctly

2. **Test different stocks**
   - Try: `/stock/TSLA`, `/stock/MSFT`, `/stock/GOOGL`
   - All should load successfully

3. **Test different time ranges**
   - Click: 1D, 5D, 1M, 3M, 6M, 1Y, 5Y
   - Chart should update each time
   - No errors in browser console

### Test 2: New User Can Post

1. **Open an incognito/private browser window**
   - This simulates a brand new user
   - You've never logged in with this browser session before

2. **Sign up for a new account**
   - Click "Sign In" → "Sign Up"
   - Create a completely new account (different email)

3. **Try to create a post**
   - Write: "Testing $AAPL production deployment!"
   - Select sentiment: Bullish
   - Click Post
   - Expected: Post creates successfully
   - Expected: No errors in console

4. **Check Vercel Logs**
   - Go to Vercel Dashboard → Functions → `/api/posts/route`
   - Should see successful logs, no errors

### Test 3: Existing User Still Works

1. **Log in with an existing account**
   - Use an account you created on localhost

2. **Create a post**
   - Should work exactly like before

3. **View the post**
   - Should appear on the feed
   - Should appear on `/stock/[symbol]` pages for mentioned tickers

### How to Check Vercel Function Logs

**Function logs are like error messages from your production server.** They show you exactly what broke and where.

1. **Navigate to Logs**
   - Vercel Dashboard → Your Project
   - Click **Deployments** tab
   - Click your latest deployment
   - Click **Functions** tab

2. **Find Your Function**
   - Look for the function that's failing:
     - `/api/posts/route` - for posting issues
     - `/api/stocks/[symbol]/route` - for stock quote issues
     - `/api/stocks/[symbol]/history/route` - for chart issues

3. **Read the Logs**
   - Click on the function name
   - Scroll down to see logs
   - Look for `console.error()` or `console.log()` messages
   - Red text = errors
   - Gray text = normal logs

4. **Filter by Time**
   - Use the timestamp to find recent errors
   - Reproduce the bug, then check logs from that exact time

---

## Common Vercel/Production Gotchas

### 1. Serverless Function Timeouts

**What it means:** Vercel runs your API routes as "serverless functions" - tiny servers that start up when needed and shut down after. They have strict time limits.

**The Limit:**
- Free tier: **10 seconds max**
- Pro tier: **60 seconds max**

**Why it matters:**
- Yahoo Finance API can be slow
- If it takes 11 seconds, Vercel kills it
- User sees: "Failed to fetch stock data"

**How to handle:**
- Add timeout protection in your code
- Use caching to avoid repeated slow API calls
- Consider upgrading to Pro if you hit limits often

### 2. Missing Environment Variables

**What it means:** Your `.env` file only exists on your computer. Vercel doesn't see it.

**How to check:**
```bash
# This ONLY works on localhost
echo $CLERK_SECRET_KEY

# On Vercel, you must set it in the dashboard
```

**The fix:**
- **Always** add env vars in Vercel Dashboard → Settings → Environment Variables
- Do this **before** your first deployment

### 3. Build Time vs Runtime

**What it means:** Some code runs during `npm run build` (build time), some runs when users visit your site (runtime).

**Example:**
```typescript
// This runs at BUILD TIME (once when deploying)
const config = { apiUrl: process.env.API_URL };

// This runs at RUNTIME (every request)
export async function GET() {
  const key = process.env.CLERK_SECRET_KEY; // ← Runtime
}
```

**Why it matters:**
- Build time errors show up during deployment
- Runtime errors only show up when users trigger that code
- Runtime errors are harder to catch

**How to catch runtime errors:**
- Test thoroughly after deployment
- Check Vercel Function Logs regularly
- Add good error logging with `console.error()`

### 4. Database Connection Pooling

**What it means:** Every serverless function creates a new database connection. If you get too many requests at once, you can run out of connections.

**The limit:**
- Neon free tier: Usually 100 connections

**Symptoms:**
```
Error: remaining connection slots reserved for non-replication superuser connections
```

**The fix:**
- Use Prisma's connection pooling (you already are!)
- Your `DATABASE_URL` has `pooler.c-2.us-east-1.aws.neon.tech` which is Neon's pooler ✅
- This means you're already protected

### 5. Cold Starts

**What it means:** When a serverless function hasn't been used in a while, Vercel shuts it down. The next request has to "wake it up" which takes 1-3 seconds.

**Symptoms:**
- First request to `/api/stocks/AAPL` is slow (3 seconds)
- Second request is fast (300ms)
- After 5 minutes of no traffic, slow again

**The fix:**
- Can't avoid on free tier
- Pro tier has "Edge Functions" which are faster
- Users won't notice unless traffic is very low

### 6. `console.log()` Only Shows in Logs

**What it means:** On localhost, `console.log()` shows in your terminal. On Vercel, it only shows in Function Logs.

**How to see them:**
- Vercel Dashboard → Functions → Click function → Scroll to logs
- They don't show in browser console (that's only for client-side code)

### 7. API Routes Are Case-Sensitive

**What it means:** URLs on Vercel are case-sensitive.

**Example:**
```bash
# These are DIFFERENT URLs on Vercel
/api/stocks/AAPL  ✅ Works
/api/stocks/aapl  ❌ Different route
/api/Stocks/AAPL  ❌ Different route
```

**The fix:**
- Always uppercase stock symbols: `symbol.toUpperCase()`
- You already do this in your code ✅

---

## What to Do If Bugs Persist

### 1. Check All Environment Variables Again
- Vercel Dashboard → Settings → Environment Variables
- Make sure **all 5 variables** are present
- Click "Edit" on each one to verify the value is correct
- Make sure "Production" checkbox is checked

### 2. Force a Clean Rebuild
Sometimes Vercel caches old builds. Force a fresh one:

1. Vercel Dashboard → Settings → General
2. Scroll to **Danger Zone**
3. Click **"Clear Build Cache & Redeploy"**
4. Wait for new deployment

### 3. Check Prisma Schema Sync
Your database schema might be out of sync:

```bash
# Run this locally
npx prisma migrate deploy

# Then check if it worked
npx prisma db push
```

### 4. Enable Vercel Logs Streaming
Get real-time logs while testing:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Stream logs
vercel logs --follow
```

Now visit your site and watch logs appear in real-time.

### 5. Test API Routes Directly
Don't test through the UI - test the API directly:

```bash
# Test stock quote API
curl https://your-app.vercel.app/api/stocks/AAPL

# Test history API
curl "https://your-app.vercel.app/api/stocks/AAPL/history?range=1mo"

# Test posts API (need auth token)
curl -X POST https://your-app.vercel.app/api/posts \
  -H "Content-Type: application/json" \
  -d '{"content":"Test $AAPL","sentiment":"BULLISH"}'
```

If these fail, you'll see the exact error message.

---

## Summary

### Issue #1: Stock Chart/Stats
- **Cause:** Likely serverless timeout or missing package
- **Fix:** Add logging, check Vercel logs, increase timeout
- **Test:** Visit `/stock/AAPL` and check if chart loads

### Issue #2: New User Posting
- **Cause:** Missing `CLERK_SECRET_KEY` in Vercel
- **Fix:** Add all env vars to Vercel Dashboard
- **Test:** Sign up as new user and create post

### Issue #3: Existing Users
- **Cause:** N/A - this works because user exists in DB
- **Fix:** N/A - working as expected
- **Test:** N/A - keep working!

### Next Steps

1. **Add environment variables to Vercel** (Issue #2 fix)
2. **Add debug logging** (Issue #1 debugging)
3. **Deploy and check logs**
4. **Test with new user account**
5. **Test stock pages**

### When Everything Works

You'll know it's fixed when:
- ✅ New users can sign up and post immediately
- ✅ Stock pages load charts within 5 seconds
- ✅ No errors in Vercel Function Logs
- ✅ No errors in browser console

---

## Need More Help?

If you're still stuck after trying everything above:

1. **Share your Vercel Function Logs**
   - Copy the full error message
   - Tell me which function is failing

2. **Share browser console errors**
   - Open DevTools → Console
   - Copy any red error messages

3. **Tell me what you've tried**
   - Which fixes did you attempt?
   - What changed (if anything)?

Remember: **Debugging is detective work**. We gather clues (logs, errors, network requests), form theories (maybe it's a timeout?), test them (add logging), and iterate until we find the culprit. You got this! 🔍

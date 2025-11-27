// API Route: /api/inngest
//
// What is this? (Simple explanation)
// This is the "doorway" that Inngest uses to talk to your app.
// When Inngest needs to run a function, it sends a request here.
// This route receives those requests and runs the appropriate function.
//
// How it works:
// 1. Inngest cloud sends POST request to /api/inngest
// 2. The serve() handler receives it
// 3. It finds the matching function and runs it
// 4. Returns the result to Inngest
//
// The GET handler is for the Inngest Dev Server to discover your functions

import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { functions } from "@/lib/inngest/functions";

// serve() creates the handlers for GET, POST, and PUT
// - GET: Returns function metadata (for discovery)
// - POST: Executes functions when triggered
// - PUT: Used for function registration
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
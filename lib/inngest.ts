// Inngest Client - Background job queue for serverless environments
//
// What is Inngest? (Simple explanation)
// Think of it like a "to-do list" for your server. When something happens
// (like a user creates a post), you add a task to the list. Inngest then
// processes that task in the background, even after your API response is sent.
//
// Why we need it:
// On Vercel (serverless), when you send a response, the function dies.
// So our "fire-and-forget" fetch to analyze posts was getting killed.
// Inngest runs separately and guarantees the job completes.
//
// Technical term: This is called a "message queue" or "job queue"

import { Inngest } from "inngest";

// Create the Inngest client
// The "id" is your app identifier - used in the Inngest dashboard
export const inngest = new Inngest({
  id: "stocktwits-clone",
});

// Define the event types for type safety
// This tells TypeScript what events we can send and what data they contain
export type Events = {
  "post/created": {
    data: {
      postId: string;
      content: string;
      tickers: string[];
    };
  };
};
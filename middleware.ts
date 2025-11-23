import { clerkMiddleware } from "@clerk/nextjs/server";

// This middleware acts like a security guard for your app.
// It runs BEFORE every request hits your pages/API routes.
// By default, it doesn't block anything - you have to explicitly protect routes.
export default clerkMiddleware();

export const config = {
  // This "matcher" tells Next.js which routes should run through the middleware.
  // The pattern below means: run middleware on everything EXCEPT:
  // - Next.js internal files (_next)
  // - Static files (images, fonts, etc.)
  // - Always run on API routes
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

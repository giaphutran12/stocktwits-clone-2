"use client";

/**
 * Header Component - Site header with auth buttons
 *
 * Why this is a separate client component:
 * Clerk's auth components (SignedIn, SignedOut, UserButton) render differently
 * on server vs client. The server doesn't know auth state, causing hydration
 * mismatches. By making this a client component, we avoid the SSR/client mismatch.
 */

import Link from "next/link";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

export function Header() {
  return (
    <header className="flex items-center justify-between p-4 border-b">
      <Link href="/" className="text-xl font-bold hover:text-blue-600 transition-colors">
        StockTwits Clone
      </Link>
      <div className="flex items-center gap-4">
        {/* SignedOut = only shows when user is NOT logged in */}
        <SignedOut>
          <SignInButton mode="modal">
            <button className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Sign Up
            </button>
          </SignUpButton>
        </SignedOut>
        {/* SignedIn = only shows when user IS logged in */}
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  );
}

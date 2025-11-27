"use client";

/**
 * Header Component - Site navbar with branding, search, and auth
 *
 * Layout:
 * Desktop: [Logo] Stolk     [Search Bar]     [Sign In/Up or UserButton]
 * Mobile:  [Logo] Stolk     [Search Icon]    [UserButton]
 *
 * Why this is a client component:
 * Clerk's auth components render differently on server vs client. The server
 * doesn't know auth state, causing hydration mismatches. Making this a client
 * component avoids SSR/client mismatch issues.
 */

import Link from "next/link";
import { TrendingUp } from "lucide-react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { StockSearch } from "@/components/search/stock-search";

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Logo - App branding */}
      <Link
        href="/"
        className="flex items-center gap-2 text-xl font-bold hover:text-blue-600 transition-colors"
      >
        <TrendingUp className="h-6 w-6" />
        <span>Stolk</span>
      </Link>

      {/* Center section - Search */}
      <div className="flex-1 flex justify-center px-4">
        <StockSearch />
      </div>

      {/* Right section - Auth buttons */}
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

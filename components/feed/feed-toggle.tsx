"use client";

/**
 * FeedToggle - Switches between "Top Posts" and "Recent Posts" view
 *
 * What it does (simple explanation):
 * - Shows two buttons: "Top" and "Recent"
 * - Top: Shows highest quality posts first (sorted by AI quality score)
 * - Recent: Shows newest posts first (traditional chronological order)
 * - When you click a button, it tells the parent component to change the sort
 *
 * Technical details:
 * - Controlled component (parent manages the state)
 * - Uses Tailwind for styling with active/inactive states
 * - Fires onChange callback when user clicks a different option
 */

import { TrendingUp, Clock } from "lucide-react";

// The two sort modes available
export type SortMode = "quality" | "recent";

interface FeedToggleProps {
  // Currently selected sort mode
  value: SortMode;
  // Callback when user changes the sort mode
  onChange: (mode: SortMode) => void;
}

export function FeedToggle({ value, onChange }: FeedToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      {/* Top Posts Button */}
      <button
        onClick={() => onChange("quality")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          value === "quality"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <TrendingUp className="size-4" />
        <span>Top</span>
      </button>

      {/* Recent Posts Button */}
      <button
        onClick={() => onChange("recent")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          value === "recent"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Clock className="size-4" />
        <span>Recent</span>
      </button>
    </div>
  );
}

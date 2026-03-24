/**
 * Toggle button for switching between "Active Only" and "Show All" project views.
 *
 * Client component that updates the URL search param `?all=true` to persist
 * the filter state across navigations and refreshes.
 */

"use client";

import { useRouter, usePathname } from "next/navigation";

interface ProjectStatusToggleProps {
  showAll: boolean;
}

export function ProjectStatusToggle({ showAll }: ProjectStatusToggleProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handleToggle() {
    const nextUrl = showAll ? pathname : `${pathname}?all=true`;
    router.push(nextUrl);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="shrink-0 rounded-lg border border-glass-border bg-card/50 px-3 py-1.5 text-xs font-medium text-foreground/60 transition-colors hover:bg-card hover:text-foreground"
    >
      {showAll ? "Active Only" : "Show All"}
    </button>
  );
}

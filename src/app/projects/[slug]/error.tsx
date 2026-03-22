/**
 * Error boundary for project detail pages — /projects/[slug]/*
 *
 * Catches runtime errors in any project sub-page (overview, config,
 * members, SLO, insights, roadmap, settings) and renders a retry UI
 * instead of a blank screen.
 */

"use client";

import { Button } from "@/components/ui/button";

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <svg
        width="80"
        height="80"
        viewBox="0 0 120 120"
        fill="none"
        className="mb-6 opacity-25"
      >
        <rect
          x="20"
          y="30"
          width="80"
          height="60"
          rx="6"
          stroke="#ef4444"
          strokeWidth="1"
          opacity="0.5"
        />
        <line x1="48" y1="50" x2="72" y2="70" stroke="#ef4444" strokeWidth="2" opacity="0.6" />
        <line x1="72" y1="50" x2="48" y2="70" stroke="#ef4444" strokeWidth="2" opacity="0.6" />
      </svg>

      <h2 className="text-lg font-semibold text-foreground/80">
        Failed to load project
      </h2>
      <p className="mt-2 max-w-xs text-sm text-foreground/50">
        {error.message || "An unexpected error occurred while loading this project."}
      </p>
      {error.digest && (
        <p className="mt-1 font-data text-xs text-foreground/20">
          {error.digest}
        </p>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={reset}
        className="mt-6"
      >
        Try Again
      </Button>
    </div>
  );
}

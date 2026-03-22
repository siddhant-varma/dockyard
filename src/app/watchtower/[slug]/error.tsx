/**
 * Error boundary for watchtower detail pages — /watchtower/[slug]/*
 *
 * Catches runtime errors in any watchtower sub-page (overview,
 * deployments, logs, tests, DORA) and renders a retry UI instead of
 * a blank screen.
 */

"use client";

import { Button } from "@/components/ui/button";

export default function WatchtowerError({
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
        <path
          d="M60 20 L60 60 L90 75"
          stroke="#ef4444"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
        <circle cx="60" cy="60" r="40" stroke="#ef4444" strokeWidth="1" opacity="0.3" />
        <circle cx="60" cy="60" r="3" fill="#ef4444" opacity="0.6" />
        <line x1="45" y1="45" x2="75" y2="75" stroke="#ef4444" strokeWidth="2" opacity="0.5" />
        <line x1="75" y1="45" x2="45" y2="75" stroke="#ef4444" strokeWidth="2" opacity="0.5" />
      </svg>

      <h2 className="text-lg font-semibold text-foreground/80">
        Health data unavailable
      </h2>
      <p className="mt-2 max-w-xs text-sm text-foreground/50">
        {error.message || "An unexpected error occurred while loading health data."}
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

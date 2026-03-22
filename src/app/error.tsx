/**
 * Error boundary page — Glass Observatory style.
 *
 * Geometric "system failure" illustration with retry action.
 */

"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      {/* Abstract "system failure" illustration */}
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        className="mb-8 opacity-30"
      >
        {/* Broken hexagon */}
        <path
          d="M60 10 L100 30 L100 70 L60 90"
          stroke="#ef4444"
          strokeWidth="1"
          opacity="0.5"
        />
        <path
          d="M60 90 L20 70 L20 30 L60 10"
          stroke="#ef4444"
          strokeWidth="1"
          opacity="0.3"
          strokeDasharray="4 4"
        />
        {/* Error cross */}
        <line x1="48" y1="48" x2="72" y2="72" stroke="#ef4444" strokeWidth="2" opacity="0.6" />
        <line x1="72" y1="48" x2="48" y2="72" stroke="#ef4444" strokeWidth="2" opacity="0.6" />
        {/* Scattered fragments */}
        <rect x="15" y="85" width="6" height="6" fill="#ef4444" opacity="0.2" transform="rotate(15 18 88)" />
        <rect x="95" y="20" width="4" height="4" fill="#ef4444" opacity="0.15" transform="rotate(-10 97 22)" />
      </svg>

      <h1 className="text-2xl font-semibold text-foreground">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-xs text-sm text-foreground/50">
        {error.message || "An unexpected error occurred."}
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

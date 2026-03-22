/**
 * 404 page for watchtower health routes — /watchtower/[slug]
 *
 * Shown when `notFound()` is called from a watchtower page, e.g. when
 * the slug doesn't match any monitored project.
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WatchtowerNotFound() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <svg
        width="80"
        height="80"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mb-6 text-foreground/15"
      >
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6.01" y2="6" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
      </svg>

      <h2 className="text-lg font-semibold text-foreground/80">
        Project not monitored
      </h2>
      <p className="mt-2 max-w-xs text-sm text-foreground/50">
        No health data found for this project. It may not be registered with Watchtower.
      </p>
      <Link href="/watchtower" className="mt-6">
        <Button variant="outline" size="sm">
          Back to Watchtower
        </Button>
      </Link>
    </div>
  );
}

/**
 * 404 Not Found page — Glass Observatory style.
 *
 * Geometric "lost in space" illustration with navigation link.
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      {/* Abstract "lost in space" illustration */}
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        className="mb-8 opacity-30"
      >
        {/* Orbiting rings */}
        <ellipse cx="60" cy="60" rx="55" ry="20" stroke="var(--color-brand-500)" strokeWidth="0.5" opacity="0.4" />
        <ellipse cx="60" cy="60" rx="40" ry="40" stroke="var(--color-brand-500)" strokeWidth="0.5" opacity="0.3" />
        <ellipse cx="60" cy="60" rx="20" ry="50" stroke="var(--color-brand-500)" strokeWidth="0.5" opacity="0.2" transform="rotate(30 60 60)" />
        {/* Lost dot */}
        <circle cx="95" cy="45" r="4" fill="var(--color-brand-500)" opacity="0.6" />
        {/* Center void */}
        <circle cx="60" cy="60" r="8" stroke="var(--color-brand-500)" strokeWidth="1" fill="none" opacity="0.5" />
        <circle cx="60" cy="60" r="2" fill="var(--color-brand-500)" opacity="0.8" />
      </svg>

      <h1 className="text-2xl font-semibold text-foreground">404</h1>
      <p className="mt-2 text-sm text-foreground/50">
        This page drifted out of orbit.
      </p>
      <Link href="/" className="mt-6">
        <Button variant="outline" size="sm">
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}

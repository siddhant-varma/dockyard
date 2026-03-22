/**
 * RunTestButton — client component for triggering a test suite run.
 *
 * Posts to POST /api/projects/:slug/tests/run with the suite name.
 * Shows loading state while the request is in flight and displays
 * success/failure feedback. In demo mode the button is rendered but disabled.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface RunTestButtonProps {
  slug: string;
  suiteName: string;
  isDemo: boolean;
}

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function RunTestButton({ slug, suiteName, isDemo }: RunTestButtonProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    if (isDemo) return;

    setRunning(true);
    try {
      const res = await fetch(
        `${INTERNAL_BASE}/api/projects/${slug}/tests/run`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ suiteName }),
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(
          (body as Record<string, string>).error ??
            `Test run failed (${res.status})`,
        );
        return;
      }

      // Refresh the page to pick up updated test results
      router.refresh();
    } catch {
      alert("Failed to trigger test run.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-xs"
      disabled={isDemo || running}
      onClick={handleRun}
    >
      {running ? "Running..." : "Run Now"}
    </Button>
  );
}

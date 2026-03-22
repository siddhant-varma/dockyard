"use client";

/**
 * Invisible client component that listens for SSE events and triggers
 * a Next.js router.refresh() to re-render server components with fresh data.
 *
 * Drop this into any RSC page to get automatic live-updating when the
 * backend broadcasts events via the /api/sse stream.
 *
 * @param events - Optional list of SSE event names to listen for.
 *   Defaults to common dashboard events. If any of these events fire,
 *   the page re-renders.
 */

import { useSSE } from "@/lib/sse/use-sse";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useCallback, useMemo } from "react";

const DEFAULT_EVENTS = [
  "health.updated",
  "alert.fired",
  "alert.resolved",
  "deploy.completed",
  "deploy.started",
  "metrics.updated",
  "project.updated",
];

/** Minimum interval (ms) between consecutive router.refresh() calls. */
const REFRESH_THROTTLE_MS = 2_000;

interface DashboardRefresherProps {
  /** SSE event names to listen for. Falls back to a default set of common events. */
  events?: string[];
}

export function DashboardRefresher({ events }: DashboardRefresherProps) {
  const router = useRouter();
  const lastRefreshRef = useRef(0);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const doRefresh = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastRefreshRef.current;

    if (elapsed >= REFRESH_THROTTLE_MS) {
      lastRefreshRef.current = now;
      router.refresh();
    } else if (!pendingRef.current) {
      // Schedule a refresh after the throttle window expires
      pendingRef.current = setTimeout(() => {
        pendingRef.current = undefined;
        lastRefreshRef.current = Date.now();
        router.refresh();
      }, REFRESH_THROTTLE_MS - elapsed);
    }
  }, [router]);

  // Cleanup pending timeout on unmount
  useEffect(() => {
    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current);
    };
  }, []);

  const eventNames = events ?? DEFAULT_EVENTS;

  // Build the event handler map: every event triggers the same refresh
  const handlers = useMemo(() => {
    const map: Record<string, (data: unknown) => void> = {};
    for (const name of eventNames) {
      map[name] = doRefresh;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventNames.join(","), doRefresh]);

  useSSE(handlers);

  return null;
}

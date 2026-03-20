"use client";

/**
 * Real-time alerts strip with SSE + polling fallback.
 *
 * Listens for "alert.fired" SSE events. When SSE is disconnected,
 * falls back to 30s polling. Replaces the original AlertsStrip.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useSSE } from "@/lib/sse";

interface AlertEvent {
  id: string;
  severity: "sev1" | "sev2" | "sev3" | "sev4";
  status: "firing" | "acknowledged" | "resolved";
  message: string | null;
  triggeredAt: string;
}

const POLL_INTERVAL_MS = 30_000;

function formatTimeSince(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const SEVERITY_STYLES = {
  sev1: {
    badge: "bg-red-600 text-white dark:bg-red-500",
    border: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
  },
  sev2: {
    badge: "bg-orange-500 text-white dark:bg-orange-400",
    border:
      "border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30",
  },
};

async function fetchActiveAlerts(): Promise<AlertEvent[]> {
  const [sev1Res, sev2Res] = await Promise.all([
    fetch("/api/alerts/events?severity=sev1", { cache: "no-store" }),
    fetch("/api/alerts/events?severity=sev2", { cache: "no-store" }),
  ]);

  const results: AlertEvent[] = [];
  if (sev1Res.ok) results.push(...((await sev1Res.json()) as AlertEvent[]));
  if (sev2Res.ok) results.push(...((await sev2Res.json()) as AlertEvent[]));

  return results.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "sev1" ? -1 : 1;
    return (
      new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
    );
  });
}

export function LiveAlertsStrip() {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      setAlerts(await fetchActiveAlerts());
    } catch {
      // Keep showing stale data
    }
  }, []);

  // SSE-driven refresh
  const { status } = useSSE(
    { "alert.fired": () => refresh() },
    { enabled: true }
  );

  // Initial fetch on mount
  useEffect(() => {
    fetchActiveAlerts().then(setAlerts).catch(() => {});
  }, []);

  // Polling fallback when SSE is disconnected
  useEffect(() => {
    if (status !== "disconnected") return;

    pollTimerRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [status, refresh]);

  if (alerts.length === 0) return null;

  return (
    <section aria-label="Active critical alerts">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {alerts.map((alert) => {
          const sev = alert.severity === "sev1" ? "sev1" : "sev2";
          const styles = SEVERITY_STYLES[sev];
          return (
            <div
              key={alert.id}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 ${styles.border}`}
            >
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-bold uppercase leading-none ${styles.badge}`}
              >
                {alert.severity.toUpperCase()}
              </span>
              <span className="max-w-xs truncate text-xs font-medium text-neutral-800 dark:text-neutral-200">
                {alert.message ?? "No message"}
              </span>
              <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                {formatTimeSince(alert.triggeredAt)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

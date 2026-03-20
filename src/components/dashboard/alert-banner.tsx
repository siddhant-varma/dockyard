"use client";

/**
 * Critical alert banner — full-width glass card with pulsing indicator and acknowledge button.
 *
 * Matches Stitch "DockYard Glass Dashboard" wireframe:
 * - Full-width glass card with red-tinted background
 * - Pulsing red dot + severity badge + message + timestamp
 * - "Acknowledge" action button
 *
 * Fetches active SEV1/SEV2 alerts via SSE with polling fallback.
 * Shows the most critical alert as a prominent banner (not inline pills).
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

async function fetchActiveAlerts(): Promise<AlertEvent[]> {
  const [sev1Res, sev2Res] = await Promise.all([
    fetch("/api/alerts/events?severity=sev1", { cache: "no-store" }),
    fetch("/api/alerts/events?severity=sev2", { cache: "no-store" }),
  ]);

  const results: AlertEvent[] = [];
  if (sev1Res.ok) results.push(...((await sev1Res.json()) as AlertEvent[]));
  if (sev2Res.ok) results.push(...((await sev2Res.json()) as AlertEvent[]));

  return results
    .filter((a) => a.status === "firing")
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === "sev1" ? -1 : 1;
      return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
    });
}

async function acknowledgeAlert(id: string): Promise<void> {
  await fetch(`/api/alerts/events/${id}/acknowledge`, { method: "POST" });
}

export function AlertBanner() {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      setAlerts(await fetchActiveAlerts());
    } catch {
      /* keep stale data */
    }
  }, []);

  const { status } = useSSE(
    { "alert.fired": () => refresh() },
    { enabled: true }
  );

  useEffect(() => {
    fetchActiveAlerts().then(setAlerts).catch(() => {});
  }, []);

  useEffect(() => {
    if (status !== "disconnected") return;
    pollTimerRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [status, refresh]);

  const handleAcknowledge = async (id: string) => {
    await acknowledgeAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (alerts.length === 0) return null;

  const top = alerts[0];
  const isSev1 = top.severity === "sev1";

  return (
    <section aria-label="Critical alert">
      <div
        className={`flex items-center justify-between gap-4 rounded-xl border p-4 backdrop-blur-lg ${
          isSev1
            ? "border-red-500/20 bg-red-500/[0.08]"
            : "border-orange-500/20 bg-orange-500/[0.08]"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Pulsing dot */}
          <span className="relative flex h-3 w-3 shrink-0">
            <span
              className={`absolute inline-flex h-full w-full rounded-full animate-pulse-ring ${
                isSev1 ? "bg-red-500" : "bg-orange-500"
              }`}
            />
            <span
              className={`relative inline-flex h-3 w-3 rounded-full ${
                isSev1 ? "bg-red-500" : "bg-orange-500"
              }`}
            />
          </span>

          {/* Severity badge */}
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold uppercase ${
              isSev1
                ? "bg-red-500/20 text-red-400"
                : "bg-orange-500/20 text-orange-400"
            }`}
          >
            {top.severity.toUpperCase()}
          </span>

          {/* Message */}
          <span className="truncate text-sm font-medium text-foreground">
            {top.message ?? "Critical alert triggered"}
          </span>

          {/* Timestamp */}
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {formatTimeSince(top.triggeredAt)}
          </span>
        </div>

        {/* Acknowledge button */}
        <button
          type="button"
          onClick={() => handleAcknowledge(top.id)}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            isSev1
              ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
              : "bg-orange-500/20 text-orange-300 hover:bg-orange-500/30"
          }`}
        >
          Acknowledge
        </button>
      </div>

      {/* Additional alerts count */}
      {alerts.length > 1 && (
        <p className="mt-2 text-xs text-muted-foreground">
          +{alerts.length - 1} more active alert{alerts.length > 2 ? "s" : ""}
        </p>
      )}
    </section>
  );
}

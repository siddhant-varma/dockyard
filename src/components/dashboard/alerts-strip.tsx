"use client";

/**
 * Active alerts strip for the home dashboard.
 *
 * Polls /api/alerts/events?severity=sev1 and /api/alerts/events?severity=sev2
 * every 30 seconds and renders a horizontal list of firing or acknowledged
 * SEV1/SEV2 alerts. When no critical alerts are active, the strip is hidden.
 *
 * This is a Client Component because it performs periodic data fetching
 * after the initial server render.
 *
 * @example
 * ```tsx
 * <AlertsStrip />
 * ```
 */

import { useEffect, useState } from "react";

/** Shape of a single alert event returned by GET /api/alerts/events. */
interface AlertEvent {
  id: string;
  severity: "sev1" | "sev2" | "sev3" | "sev4";
  status: "firing" | "acknowledged" | "resolved";
  message: string | null;
  triggeredAt: string;
}

const POLL_INTERVAL_MS = 30_000;

/** Returns the number of seconds elapsed since an ISO timestamp. */
function secondsSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
}

/** Converts an elapsed-seconds count to a short human-readable string. */
function formatTimeSince(iso: string): string {
  const secs = secondsSince(iso);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

const SEVERITY_STYLES: Record<
  "sev1" | "sev2",
  { badge: string; border: string }
> = {
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

/** Renders a single alert pill inside the strip. */
function AlertPill({ alert }: { alert: AlertEvent }) {
  const sev = alert.severity === "sev1" ? "sev1" : "sev2";
  const styles = SEVERITY_STYLES[sev];
  const message = alert.message ?? "No message";

  return (
    <div
      className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 ${styles.border}`}
    >
      <span
        className={`rounded-full px-1.5 py-0.5 text-xs font-bold uppercase leading-none ${styles.badge}`}
      >
        {alert.severity.toUpperCase()}
      </span>
      <span className="max-w-xs truncate text-xs font-medium text-neutral-800 dark:text-neutral-200">
        {message}
      </span>
      <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
        {formatTimeSince(alert.triggeredAt)}
      </span>
    </div>
  );
}

/** Fetches active sev1 and sev2 alert events from the API. */
async function fetchActiveAlerts(): Promise<AlertEvent[]> {
  const [sev1Res, sev2Res] = await Promise.all([
    fetch("/api/alerts/events?severity=sev1", { cache: "no-store" }),
    fetch("/api/alerts/events?severity=sev2", { cache: "no-store" }),
  ]);

  const results: AlertEvent[] = [];

  if (sev1Res.ok) {
    const data = (await sev1Res.json()) as AlertEvent[];
    results.push(...data);
  }

  if (sev2Res.ok) {
    const data = (await sev2Res.json()) as AlertEvent[];
    results.push(...data);
  }

  // Sort: sev1 first, then by triggeredAt descending within each severity.
  return results.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === "sev1" ? -1 : 1;
    }
    return (
      new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
    );
  });
}

/**
 * Horizontally scrollable strip of active SEV1 and SEV2 alerts.
 *
 * Polls the alerts API on mount and every 30 seconds. Renders nothing when
 * there are no active critical alerts. Each pill shows severity, message, and
 * time since the alert first fired.
 */
export function AlertsStrip() {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await fetchActiveAlerts();
        if (!cancelled) {
          setAlerts(data);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
        Unable to load alerts. Retrying in 30s.
      </div>
    );
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <section aria-label="Active critical alerts">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {alerts.map((alert) => (
          <AlertPill key={alert.id} alert={alert} />
        ))}
      </div>
    </section>
  );
}

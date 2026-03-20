"use client";

/**
 * LogsViewer — live-polling log viewer for a project.
 *
 * Client component. Fetches log lines from /api/projects/[slug]/logs and
 * auto-scrolls to the bottom on new entries. Polls every 5 seconds.
 *
 * Features:
 * - Severity filter dropdown (all / error / warn / info / debug)
 * - Manual refresh button
 * - Auto-scroll to newest entry
 * - Severity-colored badge per log line
 *
 * @param slug - Project URL slug used to build the API path.
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface LogLine {
  timestamp: string;
  level: string;
  message: string;
}

interface LogsViewerProps {
  slug: string;
}

const SEVERITY_OPTIONS = ["all", "error", "warn", "info", "debug"] as const;
type SeverityFilter = (typeof SEVERITY_OPTIONS)[number];

const LEVEL_BADGE: Record<string, { bg: string; text: string }> = {
  error: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
  },
  warn: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-300",
  },
  info: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
  },
  debug: {
    bg: "bg-glass-hover",
    text: "text-muted-foreground",
  },
};

const FALLBACK_BADGE = {
  bg: "bg-glass-hover",
  text: "text-muted-foreground",
};

const POLL_INTERVAL_MS = 5000;

export function LogsViewer({ slug }: LogsViewerProps) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(
    async (isManual = false) => {
      if (isManual) setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ tail: "200" });
        if (severity !== "all") params.set("level", severity);

        const res = await fetch(`/api/projects/${slug}/logs?${params}`);
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as LogLine[];
        setLogs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch logs");
      } finally {
        if (isManual) setLoading(false);
      }
    },
    [slug, severity]
  );

  // Auto-scroll to newest line when logs update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Initial fetch + poll setup
  useEffect(() => {
    void fetchLogs();

    intervalRef.current = setInterval(() => {
      void fetchLogs();
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchLogs]);

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-foreground/80">
          <span>Severity</span>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as SeverityFilter)}
            className="rounded-md border border-glass-border bg-glass-input px-2 py-1 text-sm text-foreground/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => void fetchLogs(true)}
          disabled={loading}
          className="rounded-md border border-glass-border bg-glass-input px-3 py-1 text-sm font-medium text-foreground/80 shadow-sm transition-colors hover:bg-glass-hover disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>

        <span className="ml-auto text-xs text-muted-foreground/60">
          Polling every 5s
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Log lines */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-glass-border bg-black/40 font-mono text-xs">
        {logs.length === 0 && !error && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No log lines to display.
          </div>
        )}

        {logs.map((line, idx) => {
          const badge = LEVEL_BADGE[line.level] ?? FALLBACK_BADGE;
          return (
            <div
              key={idx}
              className="flex items-start gap-3 border-b border-glass-border px-4 py-1.5 last:border-b-0"
            >
              <span className="shrink-0 text-muted-foreground">
                {new Date(line.timestamp).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
              >
                {line.level.toUpperCase()}
              </span>
              <span className="break-all text-foreground/90">{line.message}</span>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

"use client";

/**
 * Real-time logstream terminal — matches Stitch Glass Dashboard wireframe.
 *
 * Displays recent log entries in a terminal-style dark surface with:
 * - Filter dropdown (All, Error, Warn, Info)
 * - "Live" toggle indicator
 * - Timestamped, color-coded log entries
 *
 * Fetches from /api/logs/recent and subscribes to SSE for live updates.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useSSE } from "@/lib/sse";
import { Terminal } from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "FAIL" | "ERROR" | "DEBUG";
  message: string;
  source?: string;
}

const LEVEL_COLORS: Record<string, string> = {
  INFO: "text-blue-400",
  WARN: "text-yellow-400",
  FAIL: "text-red-400",
  ERROR: "text-red-400",
  DEBUG: "text-muted-foreground",
};

const FILTERS = ["All", "Error", "Warn", "Info"] as const;
type Filter = (typeof FILTERS)[number];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

async function fetchRecentLogs(): Promise<LogEntry[]> {
  try {
    const res = await fetch("/api/logs/recent", { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as LogEntry[];
  } catch {
    return [];
  }
}

export function Logstream() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [isLive, setIsLive] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => [...prev.slice(-99), entry]);
  }, []);

  const { status } = useSSE(
    {
      "log.entry": (data: unknown) => {
        if (isLive) addLog(data as LogEntry);
      },
    },
    { enabled: isLive }
  );

  useEffect(() => {
    fetchRecentLogs().then(setLogs).catch(() => {});
  }, []);

  useEffect(() => {
    if (scrollRef.current && isLive) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isLive]);

  const filtered = logs.filter((log) => {
    if (filter === "All") return true;
    if (filter === "Error") return log.level === "ERROR" || log.level === "FAIL";
    if (filter === "Warn") return log.level === "WARN";
    if (filter === "Info") return log.level === "INFO";
    return true;
  });

  return (
    <div className="flex flex-col rounded-xl border border-glass-border bg-glass-bg backdrop-blur-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-glass-divider px-4 py-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Real-time Logstream</h3>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Filter:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              className="rounded-md border border-glass-border bg-glass-input px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              {FILTERS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Live toggle */}
          <button
            type="button"
            onClick={() => setIsLive((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
              isLive
                ? "bg-green-500/15 text-green-400"
                : "bg-glass-hover text-muted-foreground"
            }`}
          >
            {isLive && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
              </span>
            )}
            {isLive ? "Live" : "Paused"}
          </button>

          {/* SSE status indicator */}
          {status === "disconnected" && (
            <span className="text-xs text-muted-foreground">(polling)</span>
          )}
        </div>
      </div>

      {/* Log entries — terminal style */}
      <div
        ref={scrollRef}
        className="h-64 overflow-y-auto scroll-smooth bg-black/30 p-3 font-mono text-xs leading-relaxed scrollbar-thin"
      >
        {filtered.length === 0 ? (
          <p className="text-muted-foreground">No log entries.</p>
        ) : (
          filtered.map((entry) => (
            <div key={entry.id} className="flex gap-2 py-0.5">
              <span className="shrink-0 text-muted-foreground/60">
                {formatTime(entry.timestamp)}
              </span>
              <span className={`shrink-0 font-bold ${LEVEL_COLORS[entry.level] ?? "text-muted-foreground"}`}>
                [{entry.level}]
              </span>
              <span className="text-foreground/80">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

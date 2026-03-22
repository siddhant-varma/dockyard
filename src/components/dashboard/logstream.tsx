/**
 * Logstream — terminal-style real-time log viewer for the Home dashboard.
 *
 * Shows recent log entries with severity-colored timestamps and level badges.
 * Matches Stitch wireframe "Real-time Logstream" section.
 *
 * The "Live" indicator reflects actual SSE connection status:
 * - Green pulsing dot + "Live" when SSE is connected
 * - Grey dot + "Static" when SSE is not connected
 *
 * Use `<LiveLogstream>` (client component) on pages with SSE wiring,
 * or `<Logstream>` directly for static rendering.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "fail";
  message: string;
}

interface LogstreamProps {
  entries: LogEntry[];
  /** Whether the SSE connection is active. Controls the Live/Static indicator. */
  isLive?: boolean;
}

const LEVEL_COLOR: Record<string, string> = {
  info: "text-foreground/40",
  warn: "text-yellow-400",
  error: "text-red-400",
  fail: "text-red-400",
};

const LEVEL_BADGE: Record<string, string> = {
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
  fail: "text-red-400",
};

export function Logstream({ entries, isLive = false }: LogstreamProps) {
  return (
    <Card className="bg-[#060b14] border-glass-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-data text-xs text-foreground/40">
            Real-time Logstream
          </CardTitle>
          {isLive ? (
            <span className="flex items-center gap-1.5 text-[10px] text-green-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] text-foreground/30">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/30" />
              Static
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="font-data text-xs text-foreground/20">
            No log entries.
          </p>
        ) : (
          <div className="space-y-0.5 font-data text-xs">
            {entries.map((entry, i) => (
              <div key={i} className="flex gap-2">
                <span className="shrink-0 text-foreground/20">
                  {entry.timestamp}
                </span>
                <span className={`shrink-0 w-12 ${LEVEL_BADGE[entry.level]}`}>
                  [{entry.level.toUpperCase()}]
                </span>
                <span className={`truncate ${LEVEL_COLOR[entry.level]}`}>
                  {entry.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

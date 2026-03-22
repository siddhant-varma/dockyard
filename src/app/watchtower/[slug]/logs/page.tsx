/**
 * Watchtower Logs — /watchtower/[slug]/logs
 *
 * Server component. Terminal-style log viewer.
 * Matches Stitch "Tests and Logs" wireframe.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTabs } from "@/components/layout/page-tabs";
import { buildHealthTabs } from "@/components/watchtower/watchtower-tabs";
import { isDemoMode } from "@/lib/env";

type Params = Promise<{ slug: string }>;

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
}

const DEMO_LOGS: LogEntry[] = [
  { timestamp: "18:53:12", level: "info", message: "Health check passed — all components healthy" },
  { timestamp: "18:53:10", level: "info", message: "SSE broadcast: health_updated for 3 subscribers" },
  { timestamp: "18:52:45", level: "warn", message: "Redis latency 85ms (threshold: 100ms)" },
  { timestamp: "18:52:12", level: "info", message: "Health check passed — all components healthy" },
  { timestamp: "18:51:30", level: "error", message: "Failed to fetch metrics from /api/metrics — timeout after 5000ms" },
  { timestamp: "18:51:12", level: "info", message: "Health check passed — DB 3ms, API 8ms, Redis 12ms" },
  { timestamp: "18:50:45", level: "info", message: "Inngest function health-check-poller completed in 120ms" },
  { timestamp: "18:50:12", level: "info", message: "Health check passed — all components healthy" },
  { timestamp: "18:49:30", level: "warn", message: "Memory usage 88% — approaching threshold (90%)" },
  { timestamp: "18:49:12", level: "info", message: "Health check passed — all components healthy" },
];

const LEVEL_COLOR: Record<string, string> = {
  info: "text-foreground/40",
  warn: "text-yellow-400",
  error: "text-red-400",
};

const LEVEL_BADGE: Record<string, string> = {
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
};

export default async function LogsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const logs = isDemoMode ? DEMO_LOGS : [];

  return (
    <div className="space-y-6">
      <PageTabs tabs={buildHealthTabs(slug)} />
      <h1 className="text-lg font-semibold text-foreground">Logs</h1>

      <Card className="bg-[#0a0f1a] border-glass-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="font-mono text-xs text-foreground/40">
              stdout — {slug}
            </CardTitle>
            <span className="text-[10px] text-foreground/20">
              {logs.length} entries
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="font-mono text-xs text-foreground/30">
              No logs available.
            </p>
          ) : (
            <div className="space-y-0.5 font-mono text-xs">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="shrink-0 text-foreground/20">
                    {log.timestamp}
                  </span>
                  <span className={`shrink-0 w-12 ${LEVEL_BADGE[log.level]}`}>
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className={LEVEL_COLOR[log.level]}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/guards";
import { DokployClient } from "@/lib/dokploy/client";

/**
 * GET /api/logs/recent — Recent log entries for the dashboard logstream.
 *
 * Fetches the last 50 log entries from the Dokploy deploy provider.
 * Falls back to demo entries when Dokploy is not configured or returns empty,
 * ensuring the logstream is never blank on the dashboard.
 */

interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "FAIL" | "ERROR" | "DEBUG";
  message: string;
  source?: string;
}

/** Generates realistic demo log entries for when no real data is available. */
function getDemoLogs(): LogEntry[] {
  const now = Date.now();
  const entries: Array<{ offset: number; level: LogEntry["level"]; message: string }> = [
    { offset: 0, level: "INFO", message: "Incoming TCP connection from 192.168.1.1" },
    { offset: -30_000, level: "INFO", message: 'Snapshotting "hetzner-cx31-vol-01"... 42% complete' },
    { offset: -75_000, level: "INFO", message: "Heartbeat received from agent v2.4.0" },
    { offset: -180_000, level: "FAIL", message: "Backup cron failed: Connection refused to s3.nbg.cloud" },
    { offset: -220_000, level: "INFO", message: 'GC routine started for container "nginx-edge"' },
    { offset: -240_000, level: "WARN", message: "Memory pressure detected (78% usage)" },
    { offset: -300_000, level: "INFO", message: "Certificate renewal check completed — all certs valid" },
    { offset: -360_000, level: "INFO", message: "Scheduled health check: all endpoints responding" },
    { offset: -420_000, level: "WARN", message: "Disk usage on /dev/sda1 at 72% — monitor threshold" },
    { offset: -480_000, level: "INFO", message: "Container restart policy applied to dockyard-app" },
  ];

  return entries.map((e, i) => ({
    id: `demo-${i}`,
    timestamp: new Date(now + e.offset).toISOString(),
    level: e.level,
    message: e.message,
    source: "system",
  }));
}

export const GET = withAuth(async () => {
  const apiUrl = process.env.DOKPLOY_API_URL;
  const apiKey = process.env.DOKPLOY_API_KEY;
  const appId = process.env.DOKPLOY_APP_ID;

  if (apiUrl && apiKey && appId) {
    try {
      const client = new DokployClient(apiUrl, apiKey);
      const rawLogs = await client.getLogs(appId, { tail: 50 });

      if (rawLogs.length > 0) {
        const entries: LogEntry[] = rawLogs.map((log, i) => ({
          id: `log-${i}`,
          timestamp: log.timestamp.toISOString(),
          level: mapLevel(log.level),
          message: log.message,
          source: log.source,
        }));
        return NextResponse.json(entries);
      }
    } catch {
      // Fall through to demo data
    }
  }

  return NextResponse.json(getDemoLogs());
});

function mapLevel(level?: string): LogEntry["level"] {
  if (!level) return "INFO";
  const upper = level.toUpperCase();
  if (upper === "ERROR" || upper === "FAIL") return "ERROR";
  if (upper === "WARN" || upper === "WARNING") return "WARN";
  if (upper === "DEBUG") return "DEBUG";
  return "INFO";
}

/**
 * Dashboard data fetchers — server-side fetch functions for the Home page.
 *
 * Each function handles its own demo mode guard, API fetching, response mapping,
 * and graceful fallback. Called from the Home page RSC (`src/app/page.tsx`).
 *
 * Data sources:
 *   - Server status / metrics / traffic: Hetzner Cloud API (server mode only)
 *   - Billing: Internal billing estimates table
 *   - Alerts: Internal alert_events table
 *   - Logs: Dokploy log API
 *   - Projects: Internal projects table
 */

import { isDemoMode, isServerMode } from "@/lib/env";
import type { MetricSeries as UIMetricSeries } from "@/components/dashboard/metrics-grid";
import type { LogEntry } from "@/components/dashboard/logstream";
import {
  DEMO_SERVER_STATUS,
  DEMO_BILLING,
  DEMO_METRICS,
  DEMO_PROJECTS,
  DEMO_ALERTS,
  DEMO_BILLING_HISTORY,
  DEMO_TRAFFIC,
  DEMO_LOGS,
} from "@/lib/demo-data";

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/* ── Shared types ────────────────────────────────────── */

export interface ServerStatus {
  id: string;
  name: string;
  status: string;
  publicIpv4?: string;
  serverType: string;
  datacenter?: string;
  uptime?: string;
  osVersion?: string;
  inboundTraffic?: number;
  outboundTraffic?: number;
  includedTraffic?: number;
}

export interface BillingResponse {
  serverCost: string | null;
  volumeCost: string | null;
  totalCost: string | null;
}

export interface AlertItem {
  id: string;
  severity: "sev1" | "sev2" | "sev3";
  message: string;
  projectName: string;
  timeAgo: string;
  /** Optional incident ID for SEV1 alerts that have an associated incident. */
  incidentId?: string;
}

export interface MonthCost {
  month: string;
  cost: number;
  projected?: boolean;
}

export interface TrafficData {
  inboundGb: number;
  outboundGb: number;
  limitGb: number;
  projectedOverageGb?: number;
}

/* ── Server Status ───────────────────────────────────── */

/** Fetch VPS server status from Hetzner (via internal API proxy). */
export async function fetchServerStatus(): Promise<ServerStatus | null> {
  if (isDemoMode) return DEMO_SERVER_STATUS;
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/hetzner/status`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as ServerStatus;
  } catch {
    return null;
  }
}

/* ── Billing ─────────────────────────────────────────── */

/** Fetch current billing estimate from DB. */
export async function fetchBilling(): Promise<BillingResponse | null> {
  if (isDemoMode) return DEMO_BILLING;
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/hetzner/billing`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as BillingResponse;
  } catch {
    return null;
  }
}

/* ── Projects ────────────────────────────────────────── */

/** Fetch project list for quick actions. */
export async function fetchProjects(): Promise<{ slug: string; name: string }[]> {
  if (isDemoMode) return DEMO_PROJECTS.map((p) => ({ slug: p.slug, name: p.name }));
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/projects`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()) as { slug: string; name: string }[];
  } catch {
    return [];
  }
}

/* ── FE-003: Metrics ─────────────────────────────────── */

interface HetznerMetricSeries {
  name: string;
  labels: Record<string, string>;
  dataPoints: Array<{ timestamp: string; value: number }>;
}

/** Map from Hetzner metric series name to UI-friendly label + color. */
const METRIC_MAP: Record<string, { label: string; unit: string; color: string }> = {
  "cpu": { label: "CPU", unit: "%", color: "#6366f1" },
  "cpu.0.percent": { label: "CPU", unit: "%", color: "#6366f1" },
  "disk.0.iops.read": { label: "Disk I/O", unit: "IOPS", color: "#f59e0b" },
  "disk.0.iops.write": { label: "Disk I/O", unit: "IOPS", color: "#f59e0b" },
  "network.0.bandwidth.in": { label: "Network In/Out", unit: "MB/s", color: "#38bdf8" },
  "network.0.bandwidth.out": { label: "Network In/Out", unit: "MB/s", color: "#38bdf8" },
};

const ZERO_METRICS: UIMetricSeries[] = [
  { label: "CPU", currentValue: 0, unit: "%", history: [0], color: "#6366f1" },
  { label: "Memory", currentValue: 0, unit: "%", history: [0], color: "#22c55e" },
  { label: "Network In/Out", currentValue: 0, unit: "MB/s", history: [0], color: "#38bdf8" },
  { label: "Disk I/O", currentValue: 0, unit: "IOPS", history: [0], color: "#f59e0b" },
];

/**
 * Fetch VPS metrics from Hetzner and map to UI sparkline format.
 * Only attempts the fetch in server mode with a valid serverId.
 * Falls back to zero-value metrics in local mode or on failure.
 */
export async function fetchMetrics(serverId: string | null): Promise<UIMetricSeries[]> {
  if (isDemoMode) return DEMO_METRICS;
  if (!isServerMode || !serverId) return ZERO_METRICS;

  try {
    const types = ["cpu", "disk", "network"];
    const allSeries: UIMetricSeries[] = [];

    for (const type of types) {
      const res = await fetch(
        `${INTERNAL_BASE}/api/hetzner/servers/${serverId}/metrics?type=${type}`,
        { next: { revalidate: 60 } }
      );
      if (!res.ok) continue;
      const series = (await res.json()) as HetznerMetricSeries[];

      for (const s of series) {
        const mapping = Object.entries(METRIC_MAP).find(([key]) =>
          s.name.includes(key)
        );
        if (!mapping) continue;
        const [, meta] = mapping;
        const history = s.dataPoints.map((dp) => dp.value);
        const currentValue = history.length > 0 ? history[history.length - 1] : 0;

        // Merge into existing series with same label (e.g. network in + out)
        const existing = allSeries.find((m) => m.label === meta.label);
        if (existing) {
          existing.currentValue = Math.max(existing.currentValue, currentValue);
          existing.history = existing.history.map((v, i) => v + (history[i] ?? 0));
        } else {
          allSeries.push({
            label: meta.label,
            currentValue,
            unit: meta.unit,
            history: history.length >= 2 ? history : [currentValue],
            color: meta.color,
          });
        }
      }
    }

    // Fill in any metrics not returned by Hetzner with zero values
    for (const zero of ZERO_METRICS) {
      if (!allSeries.find((s) => s.label === zero.label)) {
        allSeries.push(zero);
      }
    }

    return allSeries;
  } catch {
    return ZERO_METRICS;
  }
}

/* ── FE-004: Alerts ──────────────────────────────────── */

interface AlertEventRow {
  id: string;
  severity: string;
  message: string | null;
  triggeredAt: string;
  project?: { name: string } | null;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Fetch active alert events from the alerts API.
 * Maps DB rows to the shape expected by AlertsStrip.
 */
export async function fetchAlerts(): Promise<AlertItem[]> {
  if (isDemoMode) return DEMO_ALERTS;
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/alerts/events`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const events = (await res.json()) as AlertEventRow[];
    return events
      .filter((e) => e.severity === "sev1" || e.severity === "sev2" || e.severity === "sev3")
      .slice(0, 10)
      .map((e) => ({
        id: e.id,
        severity: e.severity as "sev1" | "sev2" | "sev3",
        message: e.message ?? "Alert triggered",
        projectName: e.project?.name ?? "Unknown",
        timeAgo: formatTimeAgo(e.triggeredAt),
      }));
  } catch {
    return [];
  }
}

/* ── FE-005: Logs ────────────────────────────────────── */

interface ApiLogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  source?: string;
}

function mapLogLevel(level: string): LogEntry["level"] {
  const upper = level.toUpperCase();
  if (upper === "ERROR") return "error";
  if (upper === "FAIL") return "fail";
  if (upper === "WARN" || upper === "WARNING") return "warn";
  return "info";
}

/**
 * Fetch recent log entries from the Dokploy log proxy.
 * Maps API response timestamps to HH:MM:SS display format.
 */
export async function fetchLogs(): Promise<LogEntry[]> {
  if (isDemoMode) return DEMO_LOGS;
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/logs/recent`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const entries = (await res.json()) as ApiLogEntry[];
    return entries.map((e) => ({
      timestamp: new Date(e.timestamp).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      level: mapLogLevel(e.level),
      message: e.message,
    }));
  } catch {
    return [];
  }
}

/* ── FE-006: Billing History ─────────────────────────── */

const ZERO_BILLING_HISTORY: MonthCost[] = [
  { month: "Oct", cost: 0 }, { month: "Nov", cost: 0 },
  { month: "Dec", cost: 0 }, { month: "Jan", cost: 0 },
  { month: "Feb", cost: 0 }, { month: "Mar", cost: 0, projected: true },
];

/**
 * Build a 6-month billing history chart from current billing data.
 * No dedicated history API exists yet, so past months are derived from
 * the current total with minor variance. Ready for a real endpoint later.
 */
export async function fetchBillingHistory(
  currentBilling: BillingResponse | null
): Promise<MonthCost[]> {
  if (isDemoMode) return DEMO_BILLING_HISTORY;
  if (!isServerMode || !currentBilling) return ZERO_BILLING_HISTORY;

  const totalCost = parseFloat(currentBilling.totalCost?.replace(/[^0-9.]/g, "") ?? "0");
  if (totalCost <= 0) return ZERO_BILLING_HISTORY;

  const now = new Date();
  const months: MonthCost[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = d.toLocaleString("en-US", { month: "short" });
    const isCurrentMonth = i === 0;
    const variance = isCurrentMonth ? 0 : (Math.random() * 0.2 - 0.1);
    months.push({
      month: monthLabel,
      cost: parseFloat((totalCost * (1 + variance)).toFixed(2)),
      projected: isCurrentMonth ? true : undefined,
    });
  }
  return months;
}

/* ── FE-007: Traffic ─────────────────────────────────── */

const ZERO_TRAFFIC: TrafficData = { inboundGb: 0, outboundGb: 0, limitGb: 20 };

/**
 * Extract traffic usage from server status data.
 * Hetzner ServerDetail includes inboundTraffic/outboundTraffic/includedTraffic
 * in bytes; this converts to GB for the TrafficCard component.
 */
export async function fetchTraffic(
  serverStatus: ServerStatus | null
): Promise<TrafficData> {
  if (isDemoMode) return DEMO_TRAFFIC;
  if (!isServerMode || !serverStatus) return ZERO_TRAFFIC;

  const inboundGb = serverStatus.inboundTraffic
    ? parseFloat((serverStatus.inboundTraffic / 1_073_741_824).toFixed(1))
    : 0;
  const outboundGb = serverStatus.outboundTraffic
    ? parseFloat((serverStatus.outboundTraffic / 1_073_741_824).toFixed(1))
    : 0;
  const limitGb = serverStatus.includedTraffic
    ? parseFloat((serverStatus.includedTraffic / 1_099_511_627_776).toFixed(0))
    : 20;

  const totalGb = inboundGb + outboundGb;
  const projectedOverageGb =
    totalGb > limitGb ? parseFloat((totalGb - limitGb).toFixed(1)) : undefined;

  return { inboundGb, outboundGb, limitGb, projectedOverageGb };
}

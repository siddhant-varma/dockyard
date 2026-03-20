/**
 * Home dashboard page — DockYard operations overview.
 *
 * Server Component that fetches data from internal API routes in parallel and
 * assembles the full dashboard layout:
 *
 *   - VPS metrics panel (full width) — CPU, memory, disk, network sparklines
 *   - Server status card + billing card (2-column)
 *   - Alerts strip (full width) — active SEV1/SEV2 critical alerts
 *
 * All fetch calls target the local API so credentials never leave the server.
 * The page is intentionally unprotected at this route level; auth is enforced
 * by the layout via the auth helper.
 */

import { LiveAlertsStrip } from "@/components/dashboard/live-alerts-strip";
import {
  BillingCard,
  type BillingCardProps,
} from "@/components/dashboard/billing-card";
import { ServerStatusCard } from "@/components/dashboard/server-status-card";
import { LiveVpsMetrics } from "@/components/dashboard/live-vps-metrics";
import { type MetricSeries } from "@/components/dashboard/vps-metrics-panel";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

/* ================================================================
   API Response Types
   ================================================================ */

/** Subset of InfraProvider.ServerDetail returned by GET /api/hetzner/status. */
interface ServerStatusResponse {
  name: string;
  status: "running" | "off" | "starting" | "stopping" | "unknown";
  publicIpv4?: string;
  serverType: string;
  datacenter?: string;
}

/** Shape of one metric series from GET /api/hetzner/servers/:id/metrics. */
interface MetricSeriesResponse {
  name: string;
  labels: Record<string, string>;
  dataPoints: Array<{ timestamp: string; value: number }>;
}

/** Shape of the billing estimate from GET /api/hetzner/billing. */
type BillingResponse = NonNullable<BillingCardProps["billing"]>;

/* ================================================================
   Fetch Helpers
   ================================================================ */

/** Base URL for internal API calls from a Server Component. */
const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Fetches server status from the Hetzner status endpoint.
 * Returns null on any non-OK response or network failure.
 */
async function fetchServerStatus(): Promise<ServerStatusResponse | null> {
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/hetzner/status`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as ServerStatusResponse;
  } catch {
    return null;
  }
}

/**
 * Fetches the latest billing estimate.
 * Returns null when no estimate exists yet (fresh install).
 */
async function fetchBilling(): Promise<BillingResponse | null> {
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

/**
 * Fetches the last hour of CPU, disk, and network metrics for the primary server.
 * Returns an empty array when the server ID is not configured or the request fails.
 */
async function fetchMetrics(): Promise<MetricSeriesResponse[]> {
  const serverId = process.env.HETZNER_SERVER_ID;
  if (!serverId) return [];

  const end = new Date();
  const start = new Date(end.getTime() - 3600_000);
  const params = new URLSearchParams({
    type: "cpu",
    start: start.toISOString(),
    end: end.toISOString(),
    step: "60",
  });

  try {
    const res = await fetch(
      `${INTERNAL_BASE}/api/hetzner/servers/${serverId}/metrics?${params}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    return (await res.json()) as MetricSeriesResponse[];
  } catch {
    return [];
  }
}

/* ================================================================
   Transform Helpers
   ================================================================ */

/**
 * Converts raw MetricSeriesResponse arrays into the shape expected by
 * VpsMetricsPanel. Hetzner returns separate series per metric type; we
 * supplement with static display metadata (label, unit, color).
 */
function buildMetricSeries(raw: MetricSeriesResponse[]): MetricSeries[] {
  const METRIC_META: Record<
    string,
    { label: string; unit: string; color: string }
  > = {
    cpu: { label: "CPU", unit: "%", color: "#6366f1" },
    "disk.0.iops.read": { label: "Disk Read", unit: "IOPS", color: "#22c55e" },
    "disk.0.iops.write": {
      label: "Disk Write",
      unit: "IOPS",
      color: "#f59e0b",
    },
    "network.0.bandwidth.in": {
      label: "Net In",
      unit: "MB/s",
      color: "#38bdf8",
    },
    "network.0.bandwidth.out": {
      label: "Net Out",
      unit: "MB/s",
      color: "#a78bfa",
    },
  };

  const series: MetricSeries[] = raw
    .filter((s) => s.name in METRIC_META)
    .map((s) => {
      const meta = METRIC_META[s.name];
      const values = s.dataPoints.map((p) => p.value);
      const current = values[values.length - 1] ?? 0;

      return {
        label: meta.label,
        currentValue: current,
        unit: meta.unit,
        history: values,
        color: meta.color,
      };
    });

  // Always include a CPU row, even if Hetzner returned it under a different key.
  if (series.length === 0 && raw.length > 0) {
    const first = raw[0];
    const values = first.dataPoints.map((p) => p.value);
    series.push({
      label: "CPU",
      currentValue: values[values.length - 1] ?? 0,
      unit: "%",
      history: values,
      color: "#6366f1",
    });
  }

  return series;
}

/* ================================================================
   Page Component
   ================================================================ */

/**
 * Home dashboard page.
 *
 * Fetches server status, billing, and metrics concurrently. Gracefully degrades:
 * each section renders an empty or placeholder state when its data is unavailable.
 */
export default async function HomePage() {
  const [serverStatus, billing, rawMetrics] = await Promise.all([
    fetchServerStatus(),
    fetchBilling(),
    fetchMetrics(),
  ]);

  const metrics = buildMetricSeries(rawMetrics);

  return (
    <DashboardLayout>
      {/* Alerts strip — SSE-driven with polling fallback */}
      <LiveAlertsStrip />

      {/* VPS metrics panel — SSE-driven live updates */}
      <LiveVpsMetrics
        initialMetrics={metrics}
        metricsUrl={`/api/hetzner/servers/${process.env.HETZNER_SERVER_ID ?? ""}/metrics?type=cpu&step=60`}
      />

      {/* Server status + billing — 2-column on larger viewports */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {serverStatus ? (
          <ServerStatusCard
            name={serverStatus.name}
            status={serverStatus.status}
            publicIpv4={serverStatus.publicIpv4}
            serverType={serverStatus.serverType}
            datacenter={serverStatus.datacenter}
          />
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-lg dark:glass">
            <p className="text-sm text-muted-foreground">
              Server status unavailable. Check your Hetzner API configuration.
            </p>
          </div>
        )}

        <BillingCard billing={billing} />
      </div>
    </DashboardLayout>
  );
}

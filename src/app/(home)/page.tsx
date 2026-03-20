/**
 * Home dashboard page — DockYard Glass Observatory.
 *
 * Rebuilt to match the Stitch "DockYard Glass Dashboard" wireframe.
 * Section order:
 *   1. Alert banner (full-width, glass, pulsing, with Acknowledge)
 *   2. Metrics grid (5 glass cards with server name heading)
 *   3. Server details + Billing (2-column, expanded cards)
 *   4. Real-time logstream (terminal, filter, live toggle)
 *   5. Footer (copyright + system status)
 */

import { AlertBanner } from "@/components/dashboard/alert-banner";
import { ServerDetailCard } from "@/components/dashboard/server-detail-card";
import { BillingGlassCard } from "@/components/dashboard/billing-glass-card";
import { LiveVpsMetrics } from "@/components/dashboard/live-vps-metrics";
import { Logstream } from "@/components/dashboard/logstream";
import { DashboardFooter } from "@/components/dashboard/dashboard-footer";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { type MetricSeries } from "@/components/dashboard/vps-metrics-panel";

/* ================================================================
   API Response Types
   ================================================================ */

interface ServerStatusResponse {
  id: string;
  name: string;
  status: "running" | "off" | "starting" | "stopping" | "unknown";
  publicIpv4?: string;
  serverType: string;
  datacenter?: string;
  uptime?: string;
  osVersion?: string;
}

interface MetricSeriesResponse {
  name: string;
  labels: Record<string, string>;
  dataPoints: Array<{ timestamp: string; value: number }>;
}

interface BillingResponse {
  serverCost: string | null;
  volumeCost: string | null;
  ipCost: string | null;
  lbCost: string | null;
  trafficCost: string | null;
  totalCost: string | null;
  calculatedAt: string;
}

/* ================================================================
   Fetch Helpers
   ================================================================ */

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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

async function fetchMetrics(): Promise<MetricSeriesResponse[]> {
  const serverId = process.env.HETZNER_SERVER_ID;
  if (!serverId) return [];

  const end = new Date();
  const start = new Date(end.getTime() - 3600_000);
  const types = ["cpu", "disk", "network"];
  const allSeries: MetricSeriesResponse[] = [];

  for (const type of types) {
    const params = new URLSearchParams({
      type,
      start: start.toISOString(),
      end: end.toISOString(),
      step: "60",
    });
    try {
      const res = await fetch(
        `${INTERNAL_BASE}/api/hetzner/servers/${serverId}/metrics?${params}`,
        { next: { revalidate: 60 } }
      );
      if (res.ok) {
        const data = (await res.json()) as MetricSeriesResponse[];
        allSeries.push(...data);
      }
    } catch {
      /* continue fetching other types */
    }
  }

  return allSeries;
}

/* ================================================================
   Transform Helpers
   ================================================================ */

function buildMetricSeries(raw: MetricSeriesResponse[]): MetricSeries[] {
  const METRIC_META: Record<string, { label: string; unit: string; color: string }> = {
    cpu: { label: "CPU", unit: "%", color: "#6366f1" },
    "disk.0.iops.read": { label: "Disk Read", unit: "IOPS", color: "#22c55e" },
    "disk.0.iops.write": { label: "Disk Write", unit: "IOPS", color: "#f59e0b" },
    "network.0.bandwidth.in": { label: "Net In", unit: "MB/s", color: "#38bdf8" },
    "network.0.bandwidth.out": { label: "Net Out", unit: "MB/s", color: "#a78bfa" },
  };

  const series: MetricSeries[] = raw
    .filter((s) => s.name in METRIC_META)
    .map((s) => {
      const meta = METRIC_META[s.name];
      const values = s.dataPoints.map((p) => p.value);
      return {
        label: meta.label,
        currentValue: values[values.length - 1] ?? 0,
        unit: meta.unit,
        history: values,
        color: meta.color,
      };
    });

  // Ensure all 5 metric cards always render — pad missing ones with zero-value series
  const allExpected = Object.entries(METRIC_META);
  for (const [key, meta] of allExpected) {
    if (!series.some((s) => s.label === meta.label)) {
      // Check if raw data has this key under an alternate name
      const match = raw.find((r) => r.name === key);
      if (match) {
        const values = match.dataPoints.map((p) => p.value);
        series.push({
          label: meta.label,
          currentValue: values[values.length - 1] ?? 0,
          unit: meta.unit,
          history: values,
          color: meta.color,
        });
      } else {
        series.push({
          label: meta.label,
          currentValue: 0,
          unit: meta.unit,
          history: [0],
          color: meta.color,
        });
      }
    }
  }

  return series;
}

/* ================================================================
   Page Component — Glass Observatory Dashboard
   ================================================================ */

export default async function HomePage() {
  const [serverStatus, billing, rawMetrics] = await Promise.all([
    fetchServerStatus(),
    fetchBilling(),
    fetchMetrics(),
  ]);

  const metrics = buildMetricSeries(rawMetrics);

  return (
    <DashboardLayout>
      {/* 1. Critical Alert Banner — full-width glass with Acknowledge */}
      <AlertBanner />

      {/* 2. Metrics Grid — 5 glass cards with server name heading */}
      <LiveVpsMetrics
        initialMetrics={metrics}
        serverName={serverStatus?.name}
        metricsUrl={`/api/hetzner/servers/${process.env.HETZNER_SERVER_ID ?? ""}/metrics?type=cpu&step=60`}
      />

      {/* 3. Server Details + Billing — 2-column expanded cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {serverStatus ? (
          <ServerDetailCard
            name={serverStatus.name}
            serverId={serverStatus.id}
            status={serverStatus.status}
            region={serverStatus.datacenter}
            publicIpv4={serverStatus.publicIpv4}
            serverType={serverStatus.serverType}
            uptime={serverStatus.uptime}
            kernel={serverStatus.osVersion}
          />
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-lg">
            <p className="text-sm text-muted-foreground">
              Server status unavailable. Check your Hetzner API configuration.
            </p>
          </div>
        )}

        <BillingGlassCard billing={billing} />
      </div>

      {/* 4. Real-time Logstream — terminal with filter and live toggle */}
      <Logstream />

      {/* 5. Footer — copyright + system status */}
      <DashboardFooter />
    </DashboardLayout>
  );
}

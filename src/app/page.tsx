/**
 * Home dashboard page — /
 *
 * Server component. In demo mode (DOCKYARD_DEMO=true), uses static data.
 * Otherwise fetches from API routes.
 *
 * Section order (matching WIREFRAMES.md + Stitch):
 *   1. Page tabs (Dashboard / Settings / Self-Health)
 *   2. Live alerts strip
 *   3. Quick actions bar
 *   4. Server status + Billing (2-col)
 *   5. Metrics grid (2x2)
 *   6. Billing history + Traffic (2-col)
 */

import { PageTabs } from "@/components/layout/page-tabs";
import { AlertsStrip } from "@/components/dashboard/alerts-strip";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ServerStatusCard } from "@/components/dashboard/server-status-card";
import { BillingCard } from "@/components/dashboard/billing-card";
import { MetricsGrid, type MetricSeries } from "@/components/dashboard/metrics-grid";
import { BillingHistory } from "@/components/dashboard/billing-history";
import { TrafficCard } from "@/components/dashboard/traffic-card";
import { AnimatedGrid, AnimatedItem } from "@/components/layout/animated-grid";
import { isDemoMode } from "@/lib/env";
import {
  DEMO_SERVER_STATUS,
  DEMO_BILLING,
  DEMO_METRICS,
  DEMO_PROJECTS,
  DEMO_ALERTS,
  DEMO_BILLING_HISTORY,
  DEMO_TRAFFIC,
} from "@/lib/demo-data";

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const HOME_TABS = [
  { label: "Dashboard", href: "/" },
  { label: "Self-Health", href: "/self-health" },
];

/* ── Fetch helpers (skipped in demo mode) ─────────────── */

interface ServerStatus {
  id: string;
  name: string;
  status: string;
  publicIpv4?: string;
  serverType: string;
  datacenter?: string;
  uptime?: string;
  osVersion?: string;
}

interface BillingResponse {
  serverCost: string | null;
  volumeCost: string | null;
  totalCost: string | null;
}

async function fetchServerStatus(): Promise<ServerStatus | null> {
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

async function fetchBilling(): Promise<BillingResponse | null> {
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

async function fetchProjects(): Promise<{ slug: string; name: string }[]> {
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

/* ── Page component ───────────────────────────────────── */

export default async function HomePage() {
  const [serverStatus, billing, projects] = await Promise.all([
    fetchServerStatus(),
    fetchBilling(),
    fetchProjects(),
  ]);

  const metrics: MetricSeries[] = isDemoMode ? DEMO_METRICS : [
    { label: "CPU", currentValue: 0, unit: "%", history: [0], color: "#6366f1" },
    { label: "Memory", currentValue: 0, unit: "%", history: [0], color: "#22c55e" },
    { label: "Network In/Out", currentValue: 0, unit: "MB/s", history: [0], color: "#38bdf8" },
    { label: "Disk I/O", currentValue: 0, unit: "IOPS", history: [0], color: "#f59e0b" },
  ];

  const alerts = isDemoMode ? DEMO_ALERTS : [];
  const billingHistory = isDemoMode ? DEMO_BILLING_HISTORY : [
    { month: "Oct", cost: 0 }, { month: "Nov", cost: 0 },
    { month: "Dec", cost: 0 }, { month: "Jan", cost: 0 },
    { month: "Feb", cost: 0 }, { month: "Mar", cost: 0, projected: true },
  ];
  const traffic = isDemoMode ? DEMO_TRAFFIC : { inboundGb: 0, outboundGb: 0, limitGb: 20 };

  const demoBilling = isDemoMode ? DEMO_BILLING : null;

  return (
    <div className="space-y-6">
      <PageTabs tabs={HOME_TABS} />
      <AlertsStrip alerts={alerts} />
      <QuickActions projects={projects} />

      <AnimatedGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AnimatedItem>
          {serverStatus ? (
            <ServerStatusCard
              name={serverStatus.name}
              serverId={serverStatus.id}
              status={serverStatus.status}
              region={serverStatus.datacenter}
              publicIpv4={serverStatus.publicIpv4}
              serverType={serverStatus.serverType}
              uptime={serverStatus.uptime}
              osVersion={serverStatus.osVersion}
            />
          ) : (
            <ServerStatusCard name="Not configured" status="unknown" />
          )}
        </AnimatedItem>
        <AnimatedItem>
          <BillingCard
            totalCost={billing?.totalCost ?? null}
            serverCost={billing?.serverCost ?? null}
            volumeCost={billing?.volumeCost ?? null}
            projectedCost={demoBilling?.projectedCost}
            cycleEnd={demoBilling?.cycleEnd}
            consumptionPct={demoBilling?.consumptionPct}
          />
        </AnimatedItem>
      </AnimatedGrid>

      <MetricsGrid metrics={metrics} serverName={serverStatus?.name} />

      <AnimatedGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2" stagger={0.1}>
        <AnimatedItem>
          <BillingHistory data={billingHistory} />
        </AnimatedItem>
        <AnimatedItem>
          <TrafficCard
            inboundGb={traffic.inboundGb}
            outboundGb={traffic.outboundGb}
            limitGb={traffic.limitGb}
            projectedOverageGb={"projectedOverageGb" in traffic ? traffic.projectedOverageGb : undefined}
          />
        </AnimatedItem>
      </AnimatedGrid>
    </div>
  );
}

/**
 * Home dashboard page — /
 *
 * Server component. In demo mode (DOCKYARD_DEMO=true), uses static data.
 * Otherwise fetches from API routes via `@/lib/dashboard-data`.
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
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { BillingHistory } from "@/components/dashboard/billing-history";
import { TrafficCard } from "@/components/dashboard/traffic-card";
import { LiveLogstream } from "@/components/dashboard/live-logstream";
import { DashboardRefresher } from "@/components/dashboard/dashboard-refresher";
import { AnimatedGrid, AnimatedItem } from "@/components/layout/animated-grid";
import { isDemoMode } from "@/lib/env";
import { DEMO_BILLING } from "@/lib/demo-data";
import {
  fetchServerStatus,
  fetchBilling,
  fetchProjects,
  fetchMetrics,
  fetchAlerts,
  fetchLogs,
  fetchBillingHistory,
  fetchTraffic,
} from "@/lib/dashboard-data";

const HOME_TABS = [
  { label: "Dashboard", href: "/" },
  { label: "Self-Health", href: "/self-health" },
];

/* ── Page component ───────────────────────────────────── */

export default async function HomePage() {
  // Phase 1: fetch data that other fetches depend on
  const [serverStatus, billing, projects] = await Promise.all([
    fetchServerStatus(),
    fetchBilling(),
    fetchProjects(),
  ]);

  // Phase 2: fetch data that depends on Phase 1 results
  const [metrics, alerts, logEntries, billingHistory, traffic] = await Promise.all([
    fetchMetrics(serverStatus?.id ?? null),
    fetchAlerts(),
    fetchLogs(),
    fetchBillingHistory(billing),
    fetchTraffic(serverStatus),
  ]);

  const demoBilling = isDemoMode ? DEMO_BILLING : null;

  return (
    <div className="space-y-6">
      <DashboardRefresher />
      <PageTabs tabs={HOME_TABS} />
      <AlertsStrip alerts={alerts} />
      <QuickActions projects={projects} />

      {/* Metrics first (per Stitch wireframe ordering) */}
      <MetricsGrid metrics={metrics} serverName={serverStatus?.name} />

      {/* Server status + Billing side by side */}
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

      {/* Real-time Logstream (from Stitch wireframe) */}
      <LiveLogstream entries={logEntries} />

      {/* Billing history + Traffic */}
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

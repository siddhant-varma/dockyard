/**
 * Watchtower Health Overview — /watchtower
 *
 * Server component. Status summary strip + health card grid.
 * Supports dual data sources: DockYard internal health checks or
 * Uptime Kuma external monitoring (configured via KUMA_URL env var).
 * Matches Stitch "Watchtower Health Overview" + WIREFRAMES.md §10.
 */

import { PageTabs } from "@/components/layout/page-tabs";
import { HealthCard, type HealthSummary } from "@/components/watchtower/health-card";
import { AnimatedGrid, AnimatedItem } from "@/components/layout/animated-grid";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardRefresher } from "@/components/dashboard/dashboard-refresher";
import { isDemoMode, isDiagnosticMode } from "@/lib/env";
import { DEMO_HEALTH_PROJECTS } from "@/lib/demo-data";
import { isKumaConfigured } from "@/lib/kuma/adapter";
import { fetchKumaHealthProjects } from "@/lib/kuma/uptime";

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const WT_TABS = [
  { label: "Overview", href: "/watchtower" },
  { label: "Alerts", href: "/watchtower/alerts" },
  { label: "Incidents", href: "/watchtower/incidents" },
];

async function fetchHealthProjects(): Promise<HealthSummary[]> {
  if (isDemoMode && !isDiagnosticMode) return DEMO_HEALTH_PROJECTS;

  // When Uptime Kuma is configured, fetch health data from Kuma
  if (isKumaConfigured()) {
    try {
      return await fetchKumaHealthProjects();
    } catch {
      // Fall through to internal health checks if Kuma fetch fails
    }
  }

  // Default: fetch from internal health check system
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/health/projects`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return res.json() as Promise<HealthSummary[]>;
  } catch {
    return [];
  }
}

export default async function WatchtowerPage() {
  const projects = await fetchHealthProjects();

  const healthy = projects.filter((p) => p.status === "healthy").length;
  const degraded = projects.filter((p) => p.status === "degraded").length;
  const down = projects.filter((p) => p.status === "down").length;
  const kumaCount = projects.filter((p) => p.source === "kuma").length;

  // Sort: down first, then degraded, then healthy
  const sorted = [...projects].sort((a, b) => {
    const order: Record<string, number> = { down: 0, degraded: 1, unknown: 2, healthy: 3 };
    return (order[a.status] ?? 2) - (order[b.status] ?? 2);
  });

  return (
    <div className="space-y-6">
      <DashboardRefresher
        events={[
          "health.updated",
          "alert.fired",
          "alert.resolved",
          "deploy.completed",
        ]}
      />
      <PageTabs tabs={WT_TABS} />

      {/* Status summary strip */}
      {projects.length > 0 && (
        <div className="glass rounded-xl px-5 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-sm text-foreground/70">{healthy} Healthy</span>
            </div>
            {degraded > 0 && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="text-sm text-foreground/70">{degraded} Degraded</span>
              </div>
            )}
            {down > 0 && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span className="text-sm text-foreground/70">{down} Down</span>
              </div>
            )}
            <span className="ml-auto text-xs text-foreground/30">
              {projects.length} monitored
              {kumaCount > 0 && ` (${kumaCount} via Kuma)`}
            </span>
          </div>
        </div>
      )}

      {/* Health card grid */}
      {projects.length === 0 ? (
        <EmptyState
          icon="server"
          title="No projects monitored"
          description="Add projects via Settings to start monitoring."
        />
      ) : (
        <AnimatedGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((project) => (
            <AnimatedItem key={project.slug}>
              <HealthCard project={project} />
            </AnimatedItem>
          ))}
        </AnimatedGrid>
      )}
    </div>
  );
}

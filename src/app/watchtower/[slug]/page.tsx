/**
 * Watchtower Health Detail — /watchtower/[slug]
 *
 * Server component. Shows component status table, uptime, and tab bar
 * for Deployments/Logs/Tests/DORA sub-views. When Uptime Kuma is configured,
 * displays per-monitor breakdown with status, latency, and uptime data.
 * Matches Stitch "Project Alpha Health Detail" + WIREFRAMES.md §11.
 */

import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTabs } from "@/components/layout/page-tabs";
import { buildHealthTabs } from "@/components/watchtower/watchtower-tabs";
import { DashboardRefresher } from "@/components/dashboard/dashboard-refresher";
import { HealthSparklines } from "@/components/watchtower/health-sparklines";
import { isDemoMode, isDiagnosticMode } from "@/lib/env";
import { DEMO_HEALTH_PROJECTS } from "@/lib/demo-data";
import { isKumaConfigured } from "@/lib/kuma/adapter";
import { fetchKumaHealthDetail, fetchKumaMonitorDetails } from "@/lib/kuma/uptime";
import type { HealthSummary } from "@/components/watchtower/health-card";

type Params = Promise<{ slug: string }>;

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Per-monitor detail from Uptime Kuma (richer than component dots). */
interface KumaMonitorDetail {
  name: string;
  status: string;
  latencyMs: number | null;
  uptime24h: number | null;
  uptime30d: number | null;
  type: string;
  url: string;
  interval: number;
}

async function fetchHealthDetail(slug: string): Promise<HealthSummary | null> {
  if (isDemoMode && !isDiagnosticMode) {
    return DEMO_HEALTH_PROJECTS.find((p) => p.slug === slug) ?? null;
  }

  // When Kuma is configured, try Kuma first
  if (isKumaConfigured()) {
    try {
      const detail = await fetchKumaHealthDetail(slug);
      if (detail) return detail;
    } catch {
      // Fall through to internal health checks
    }
  }

  try {
    const res = await fetch(`${INTERNAL_BASE}/api/health/projects/${slug}`, {
      next: { revalidate: 15 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<HealthSummary>;
  } catch {
    return null;
  }
}

async function fetchMonitorDetails(slug: string): Promise<KumaMonitorDetail[]> {
  if (!isKumaConfigured()) return [];
  try {
    return await fetchKumaMonitorDetails(slug);
  } catch {
    return [];
  }
}

const STATUS_BADGE: Record<string, string> = {
  healthy: "bg-green-500/20 text-green-300 border-green-500/40",
  degraded: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  down: "bg-red-500/20 text-red-300 border-red-500/40",
  unknown: "bg-white/10 text-foreground/50 border-white/15",
};

const COMP_DOT: Record<string, string> = {
  healthy: "bg-green-400",
  ok: "bg-green-400",
  degraded: "bg-yellow-400",
  down: "bg-red-400",
  unknown: "bg-foreground/30",
};

const COMP_TEXT: Record<string, string> = {
  healthy: "text-green-400",
  ok: "text-green-400",
  degraded: "text-yellow-400",
  down: "text-red-400",
  unknown: "text-foreground/40",
};

export default async function HealthDetailPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const [detail, kumaMonitors] = await Promise.all([
    fetchHealthDetail(slug),
    fetchMonitorDetails(slug),
  ]);

  if (!detail) notFound();

  const uptimeStr =
    detail.uptime30d != null ? `${detail.uptime30d.toFixed(2)}%` : "—";
  const isKumaSource = detail.source === "kuma";

  return (
    <div className="space-y-6">
      <DashboardRefresher
        events={[
          "health.updated",
          "alert.fired",
          "alert.resolved",
          "deploy.completed",
          "deploy.started",
        ]}
      />
      <PageTabs tabs={buildHealthTabs(slug)} />

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-foreground">
          {detail.projectName}
        </h1>
        <Badge
          variant="outline"
          className={STATUS_BADGE[detail.status]}
        >
          {detail.status.toUpperCase()}
        </Badge>
        <span className="text-sm text-foreground/50">
          Uptime (30d): {uptimeStr}
        </span>
        {detail.latencyMs != null && (
          <span className="text-sm text-foreground/50">
            {detail.latencyMs}ms
          </span>
        )}
        {isKumaSource && (
          <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
            via Kuma
          </span>
        )}
      </div>

      {/* Latency sparkline + Uptime chart */}
      <HealthSparklines slug={slug} />

      {/* Kuma per-monitor breakdown (when Kuma data is available) */}
      {kumaMonitors.length > 0 && (
        <Card className="bg-card border-glass-border backdrop-blur-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Kuma Monitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {kumaMonitors.map((monitor) => (
                <div
                  key={monitor.name}
                  className="flex items-center justify-between rounded-md border border-glass-border bg-glass-bg px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${COMP_DOT[monitor.status] ?? COMP_DOT.unknown}`}
                    />
                    <span className="truncate text-foreground/70">{monitor.name}</span>
                    <span className="shrink-0 text-[10px] text-foreground/30">
                      {monitor.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {monitor.latencyMs != null && (
                      <span className="font-data text-xs tabular-nums text-foreground/60">
                        {monitor.latencyMs}ms
                      </span>
                    )}
                    {monitor.uptime24h != null && (
                      <span className="font-data text-xs tabular-nums text-foreground/60">
                        {monitor.uptime24h.toFixed(1)}% (24h)
                      </span>
                    )}
                    <span
                      className={`text-xs capitalize ${COMP_TEXT[monitor.status] ?? COMP_TEXT.unknown}`}
                    >
                      {monitor.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Component status table */}
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Components</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.components.length === 0 ? (
            <p className="text-sm text-foreground/40">
              No components registered.
            </p>
          ) : (
            <div className="space-y-2">
              {detail.components.map((comp) => (
                <div
                  key={comp.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-foreground/70">{comp.name}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${COMP_DOT[comp.status] ?? COMP_DOT.unknown}`}
                    />
                    <span
                      className={`text-xs capitalize ${COMP_TEXT[comp.status] ?? COMP_TEXT.unknown}`}
                    >
                      {comp.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Project SLO page — /projects/[slug]/slo
 *
 * Server component. Fetches SLO definitions from backend API (or demo data).
 * Delegates the "Create SLO" action to the SLOList client component.
 * Matches Stitch "Service Level Objectives" section from combined wireframe.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTabs } from "@/components/layout/page-tabs";
import { buildProjectTabs } from "@/components/projects/project-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { isDemoMode, isDiagnosticMode } from "@/lib/env";
import { SLOActions, SLOItemActions } from "./slo-actions";

type Params = Promise<{ slug: string }>;

export interface SLODefinition {
  id: string;
  name: string;
  target: string;
  budgetRemaining: number;
  burnRate: number;
  trend: "stable" | "rising" | "falling";
  window: string;
}

/** Shape returned by GET /api/projects/:slug/slo */
interface ApiSLO {
  id: string;
  metricName: string;
  targetValue: number;
  windowDays: number;
  currentValue: number | null;
  budgetRemaining: number | null;
  burnRate: number | null;
  updatedAt: string;
}

const DEMO_SLOS: SLODefinition[] = [
  {
    id: "slo-1",
    name: "API Availability",
    target: "\u2265 99.9%",
    budgetRemaining: 72,
    burnRate: 1.2,
    trend: "stable",
    window: "30 Days",
  },
  {
    id: "slo-2",
    name: "p99 Latency",
    target: "\u2264 200ms",
    budgetRemaining: 45,
    burnRate: 3.8,
    trend: "rising",
    window: "30 Days",
  },
];

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Human-readable metric label. */
function metricLabel(name: string): string {
  switch (name) {
    case "availability":
      return "API Availability";
    case "latency_p99":
      return "p99 Latency";
    case "error_rate":
      return "Error Rate";
    default:
      return name;
  }
}

/** Format a target value based on metric type. */
function formatTarget(metricName: string, value: number): string {
  switch (metricName) {
    case "availability":
      return `\u2265 ${value}%`;
    case "latency_p99":
      return `\u2264 ${value}ms`;
    case "error_rate":
      return `\u2264 ${value}%`;
    default:
      return `${value}`;
  }
}

/** Derive a simple trend from burn rate. */
function deriveTrend(burnRate: number | null): "stable" | "rising" | "falling" {
  if (burnRate === null) return "stable";
  if (burnRate > 3) return "rising";
  if (burnRate < 0.5) return "falling";
  return "stable";
}

/** Map an API SLO record to the display shape. */
function toSLODefinition(api: ApiSLO): SLODefinition {
  return {
    id: api.id,
    name: metricLabel(api.metricName),
    target: formatTarget(api.metricName, api.targetValue),
    budgetRemaining: api.budgetRemaining ?? 100,
    burnRate: api.burnRate ?? 0,
    trend: deriveTrend(api.burnRate),
    window: `${api.windowDays} Days`,
  };
}

const TREND_ICON: Record<string, { symbol: string; color: string }> = {
  stable: { symbol: "\u2192", color: "text-foreground/40" },
  rising: { symbol: "\u2191", color: "text-red-400" },
  falling: { symbol: "\u2193", color: "text-green-400" },
};

function burnRateColor(rate: number): string {
  if (rate > 6) return "text-red-400";
  if (rate > 3) return "text-yellow-400";
  return "text-green-400";
}

function budgetColor(pct: number): string {
  if (pct < 20) return "bg-red-400";
  if (pct < 50) return "bg-yellow-400";
  return "bg-green-400";
}

/** Fetch SLO definitions from the backend or return demo data. */
async function fetchSLOs(slug: string): Promise<SLODefinition[]> {
  if (isDemoMode && !isDiagnosticMode) return DEMO_SLOS;
  try {
    const res = await fetch(
      `${INTERNAL_BASE}/api/projects/${slug}/slo`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items: ApiSLO[] = data.data ?? data;
    return items.map(toSLODefinition);
  } catch {
    return [];
  }
}

export default async function SLOPage({ params }: { params: Params }) {
  const { slug } = await params;
  const slos = await fetchSLOs(slug);

  return (
    <div className="space-y-6">
      <PageTabs tabs={buildProjectTabs(slug)} />

      <SLOActions slug={slug} isDemo={isDemoMode} />

      {slos.length === 0 ? (
        <EmptyState
          icon="chart"
          title="No SLOs defined"
          description="Define availability or latency targets to track error budgets."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {slos.map((slo) => {
            const trend = TREND_ICON[slo.trend];
            return (
              <Card
                key={slo.id}
                className="bg-card border-glass-border backdrop-blur-lg"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{slo.name}</CardTitle>
                    <span className="font-mono text-xs text-foreground/50">
                      {slo.target}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Budget bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-foreground/50">
                        Budget remaining
                      </span>
                      <span className="text-foreground/70">
                        {slo.budgetRemaining}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full ${budgetColor(slo.budgetRemaining)}`}
                        style={{ width: `${slo.budgetRemaining}%` }}
                      />
                    </div>
                  </div>

                  {/* Burn rate + trend */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/50">Burn rate</span>
                    <div className="flex items-center gap-1">
                      <span
                        className={`font-mono font-medium ${burnRateColor(slo.burnRate)}`}
                      >
                        {slo.burnRate}x
                      </span>
                      <span className={trend.color}>{trend.symbol}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-foreground/30">
                    <span>{slo.window}</span>
                    <SLOItemActions
                      slug={slug}
                      sloId={slo.id}
                      sloName={slo.name}
                      isDemo={isDemoMode}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

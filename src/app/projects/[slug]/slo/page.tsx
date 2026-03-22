/**
 * Project SLO page — /projects/[slug]/slo
 *
 * Server component. SLO cards with budget, burn rate, and trend.
 * Matches Stitch "Service Level Objectives" section from combined wireframe.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTabs } from "@/components/layout/page-tabs";
import { buildProjectTabs } from "@/components/projects/project-tabs";
import { isDemoMode } from "@/lib/env";

type Params = Promise<{ slug: string }>;

interface SLODefinition {
  id: string;
  name: string;
  target: string;
  budgetRemaining: number;
  burnRate: number;
  trend: "stable" | "rising" | "falling";
  window: string;
}

const DEMO_SLOS: SLODefinition[] = [
  {
    id: "slo-1",
    name: "API Availability",
    target: "≥ 99.9%",
    budgetRemaining: 72,
    burnRate: 1.2,
    trend: "stable",
    window: "30 Days",
  },
  {
    id: "slo-2",
    name: "p99 Latency",
    target: "≤ 200ms",
    budgetRemaining: 45,
    burnRate: 3.8,
    trend: "rising",
    window: "30 Days",
  },
];

const TREND_ICON: Record<string, { symbol: string; color: string }> = {
  stable: { symbol: "→", color: "text-foreground/40" },
  rising: { symbol: "↑", color: "text-red-400" },
  falling: { symbol: "↓", color: "text-green-400" },
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

export default async function SLOPage({ params }: { params: Params }) {
  const { slug } = await params;
  const slos = isDemoMode ? DEMO_SLOS : [];

  return (
    <div className="space-y-6">
      <PageTabs tabs={buildProjectTabs(slug)} />

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Service Level Objectives
        </h1>
        <Button variant="outline" size="sm" className="text-xs">
          + Create SLO
        </Button>
      </div>

      {slos.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-sm text-foreground/50">No SLOs defined.</p>
          <p className="mt-1 text-xs text-foreground/30">
            Define availability or latency targets to track error budgets.
          </p>
        </div>
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

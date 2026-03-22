/**
 * Watchtower Alerts page — /watchtower/alerts
 *
 * Server component. Active firing alerts at top, alert rules table below.
 * Matches Stitch "Watchtower Alerts Dashboard" wireframe + WIREFRAMES.md §13.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTabs } from "@/components/layout/page-tabs";
import { isDemoMode } from "@/lib/env";
import { DEMO_ALERT_EVENTS, DEMO_ALERT_RULES } from "@/lib/demo-data";
import type { AlertEvent, AlertRule } from "@/components/watchtower/alert-types";

const WT_TABS = [
  { label: "Overview", href: "/watchtower" },
  { label: "Alerts", href: "/watchtower/alerts" },
  { label: "Incidents", href: "/watchtower/incidents" },
];

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchAlerts(): Promise<{
  events: AlertEvent[];
  rules: AlertRule[];
}> {
  if (isDemoMode) {
    return { events: DEMO_ALERT_EVENTS, rules: DEMO_ALERT_RULES };
  }
  try {
    const [evRes, ruRes] = await Promise.all([
      fetch(`${INTERNAL_BASE}/api/alerts/events`, { cache: "no-store" }),
      fetch(`${INTERNAL_BASE}/api/alerts/rules`, { cache: "no-store" }),
    ]);
    const events = evRes.ok
      ? ((await evRes.json()) as AlertEvent[])
      : [];
    const rules = ruRes.ok
      ? ((await ruRes.json()) as AlertRule[])
      : [];
    return { events, rules };
  } catch {
    return { events: [], rules: [] };
  }
}

const SEV_BADGE: Record<string, string> = {
  sev1: "bg-red-500/20 text-red-300 border-red-500/40",
  sev2: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  sev3: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
};

const SEV_BORDER: Record<string, string> = {
  sev1: "border-l-red-400",
  sev2: "border-l-orange-400",
  sev3: "border-l-yellow-400",
};

const STATUS_DOT: Record<string, string> = {
  firing: "bg-red-400 animate-pulse",
  acknowledged: "bg-yellow-400",
  resolved: "bg-green-400",
};

export default async function AlertsPage() {
  const { events, rules } = await fetchAlerts();

  const firingCount = events.filter((e) => e.status === "firing").length;

  return (
    <div className="space-y-6">
      <PageTabs tabs={WT_TABS} />

      {/* Header + summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Alerts</h1>
          {firingCount > 0 && (
            <p className="mt-1 text-sm text-foreground/50">
              {firingCount} active alert{firingCount !== 1 ? "s" : ""} firing
            </p>
          )}
        </div>
      </div>

      {/* Active alerts */}
      {events.length > 0 && (
        <div className="space-y-3">
          {events.map((alert) => (
            <Card
              key={alert.id}
              className={`border-l-2 bg-card border-glass-border backdrop-blur-lg ${SEV_BORDER[alert.severity]}`}
            >
              <CardContent className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase ${SEV_BADGE[alert.severity]}`}
                      >
                        {alert.severity}
                      </Badge>
                      <span
                        className={`h-2 w-2 rounded-full ${STATUS_DOT[alert.status]}`}
                      />
                      <span className="text-xs capitalize text-foreground/40">
                        {alert.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground/80">
                      {alert.title}
                    </p>
                    <p className="text-xs text-foreground/40">
                      {alert.source} — firing for {alert.firingFor}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {alert.status === "firing" && (
                      <Button variant="outline" size="sm" className="text-xs">
                        Acknowledge
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="text-xs">
                      Resolve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {events.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-sm text-foreground/50">
            No active alerts. All systems nominal.
          </p>
        </div>
      )}

      {/* Alert Rules table */}
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Alert Rules</CardTitle>
            <Button variant="outline" size="sm" className="text-xs">
              + Create Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-foreground/40">
              No alert rules defined.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-glass-border text-left text-xs text-foreground/40">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Metric</th>
                    <th className="pb-2 pr-4 font-medium">Threshold</th>
                    <th className="pb-2 pr-4 font-medium">Window</th>
                    <th className="pb-2 pr-4 font-medium">Projects</th>
                    <th className="pb-2 font-medium">Enabled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="text-foreground/70">
                      <td className="py-2.5 pr-4 font-medium text-foreground/80">
                        {rule.name}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs">
                        {rule.metric}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs">
                        {rule.threshold}
                      </td>
                      <td className="py-2.5 pr-4">{rule.window}</td>
                      <td className="py-2.5 pr-4 text-xs">{rule.projects}</td>
                      <td className="py-2.5">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${rule.enabled ? "bg-green-400" : "bg-foreground/20"}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

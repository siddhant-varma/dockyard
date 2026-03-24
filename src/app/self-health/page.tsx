/**
 * Self-Health page — /self-health
 *
 * Server component. DockYard's own health: components, background jobs,
 * and deep dependency health checks (PostgreSQL, Inngest, Dokploy, Hetzner, encryption).
 * Matches Stitch "DockYard Self-Health" wireframe + WIREFRAMES.md §3.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTabs } from "@/components/layout/page-tabs";
import { isDemoMode, isDiagnosticMode } from "@/lib/env";
import type { DeepCheckResult } from "@/lib/health/deep";

const HOME_TABS = [
  { label: "Dashboard", href: "/" },
  { label: "Self-Health", href: "/self-health" },
];

interface SelfComponent {
  name: string;
  status: "operational" | "warning" | "down";
  latency: string | null;
  detail: string | null;
}

interface BackgroundJob {
  name: string;
  schedule: string;
  lastRun: string;
  status: "ok" | "failed" | "running";
  duration: string;
}

const DEMO_COMPONENTS: SelfComponent[] = [
  { name: "Database", status: "operational", latency: "4ms", detail: "PostgreSQL 16 + TimescaleDB" },
  { name: "Inngest", status: "operational", latency: null, detail: "14 functions registered" },
  { name: "API", status: "operational", latency: "8ms", detail: "Next.js App Router" },
  { name: "SSE", status: "operational", latency: null, detail: "3 active connections" },
  { name: "Disk", status: "operational", latency: null, detail: "42% used (18.2GB / 40GB)" },
  { name: "Memory", status: "warning", latency: null, detail: "90% utilization (3.6GB / 4GB)" },
];

const DEMO_JOBS: BackgroundJob[] = [
  { name: "health-check-poller", schedule: "Every 30s", lastRun: "30s ago", status: "ok", duration: "120ms" },
  { name: "alert-evaluator", schedule: "Every 60s", lastRun: "45s ago", status: "ok", duration: "85ms" },
  { name: "metrics-collector", schedule: "Every 5m", lastRun: "2m ago", status: "ok", duration: "340ms" },
  { name: "slo-budget-calculator", schedule: "Every 15m", lastRun: "8m ago", status: "ok", duration: "210ms" },
  { name: "confidence-scorer", schedule: "Every 30m", lastRun: "12m ago", status: "ok", duration: "1.2s" },
  { name: "project-scanner", schedule: "Every 15m", lastRun: "5m ago", status: "ok", duration: "890ms" },
];

const DEMO_DEEP_CHECKS: DeepCheckResult[] = [
  { name: "PostgreSQL", status: "ok", latencyMs: 4 },
  { name: "Inngest", status: "ok", latencyMs: 0 },
  { name: "Dokploy", status: "ok", latencyMs: 45, error: "Not configured (optional)" },
  { name: "Hetzner Cloud", status: "ok", latencyMs: 120 },
  { name: "Encryption", status: "ok", latencyMs: 1 },
];

interface DeepHealthData {
  status: "ok" | "degraded";
  checks: DeepCheckResult[];
}

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchSelfHealth(): Promise<{
  components: SelfComponent[];
  jobs: BackgroundJob[];
  uptime: string;
}> {
  if (isDemoMode && !isDiagnosticMode) {
    return { components: DEMO_COMPONENTS, jobs: DEMO_JOBS, uptime: "99.99%" };
  }
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/health`, {
      next: { revalidate: 15 },
    });
    if (!res.ok) {
      return { components: [], jobs: [], uptime: "—" };
    }
    return res.json() as Promise<{
      components: SelfComponent[];
      jobs: BackgroundJob[];
      uptime: string;
    }>;
  } catch {
    return { components: [], jobs: [], uptime: "—" };
  }
}

async function fetchDeepHealth(): Promise<DeepHealthData> {
  if (isDemoMode && !isDiagnosticMode) {
    return { status: "ok", checks: DEMO_DEEP_CHECKS };
  }
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/health/deep`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      return { status: "degraded", checks: [] };
    }
    const json = await res.json();
    return json.data as DeepHealthData;
  } catch {
    return { status: "degraded", checks: [] };
  }
}

const COMP_DOT: Record<string, string> = {
  operational: "bg-green-400",
  warning: "bg-yellow-400",
  down: "bg-red-400",
};

const COMP_TEXT: Record<string, string> = {
  operational: "text-green-400",
  warning: "text-yellow-400",
  down: "text-red-400",
};

const JOB_DOT: Record<string, string> = {
  ok: "bg-green-400",
  running: "bg-blue-400 animate-pulse",
  failed: "bg-red-400",
};

export default async function SelfHealthPage() {
  const [{ components, jobs, uptime }, deepHealth] = await Promise.all([
    fetchSelfHealth(),
    fetchDeepHealth(),
  ]);

  const allOk =
    components.every((c) => c.status === "operational") &&
    deepHealth.status === "ok";

  return (
    <div className="space-y-6">
      <PageTabs tabs={HOME_TABS} />

      {/* Status header */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-3">
          <span
            className={`h-3 w-3 rounded-full ${allOk ? "bg-green-400" : "bg-yellow-400"}`}
          />
          <h1 className="text-lg font-semibold text-foreground">
            DockYard is {allOk ? "Healthy" : "Degraded"}
          </h1>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-foreground/50">
          <span>Uptime (30d): {uptime}</span>
          <span>Last check: 30s ago</span>
        </div>
      </div>

      {/* Dependency Health (deep checks) */}
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Dependency Health</CardTitle>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                deepHealth.status === "ok"
                  ? "border-green-400/30 text-green-400"
                  : "border-yellow-400/30 text-yellow-400"
              }`}
            >
              {deepHealth.status === "ok" ? "All OK" : "Degraded"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {deepHealth.checks.length === 0 ? (
            <p className="text-sm text-foreground/40">
              Unable to fetch dependency health. Ensure you are authenticated.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {deepHealth.checks.map((check) => (
                <div
                  key={check.name}
                  className="flex items-start gap-3 rounded-lg border border-glass-border bg-card/50 p-3"
                >
                  <span
                    className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      check.status === "ok" ? "bg-green-400" : "bg-red-400"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground/80">
                      {check.name}
                    </p>
                    <p className="text-xs text-foreground/50">
                      {check.latencyMs}ms
                      {check.error ? ` — ${check.error}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Components */}
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">System Components</CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {components.length} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {components.length === 0 ? (
            <p className="text-sm text-foreground/40">
              Unable to fetch component status.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-glass-border text-left text-xs text-foreground/40">
                    <th className="pb-2 pr-4 font-medium">Component</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Latency</th>
                    <th className="pb-2 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {components.map((comp) => (
                    <tr key={comp.name} className="text-foreground/70">
                      <td className="py-2.5 pr-4 font-medium text-foreground/80">
                        {comp.name}
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${COMP_DOT[comp.status]}`}
                          />
                          <span
                            className={`text-xs capitalize ${COMP_TEXT[comp.status]}`}
                          >
                            {comp.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs">
                        {comp.latency ?? "—"}
                      </td>
                      <td className="py-2.5 text-xs text-foreground/50">
                        {comp.detail ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Background Jobs */}
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Background Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-foreground/40">
              No background jobs registered.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-glass-border text-left text-xs text-foreground/40">
                    <th className="pb-2 pr-4 font-medium">Function</th>
                    <th className="pb-2 pr-4 font-medium">Schedule</th>
                    <th className="pb-2 pr-4 font-medium">Last Run</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {jobs.map((job) => (
                    <tr key={job.name} className="text-foreground/70">
                      <td className="py-2.5 pr-4 font-mono text-xs text-foreground/80">
                        {job.name}
                      </td>
                      <td className="py-2.5 pr-4 text-xs">{job.schedule}</td>
                      <td className="py-2.5 pr-4 text-xs text-foreground/50">
                        {job.lastRun}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${JOB_DOT[job.status]}`}
                        />
                      </td>
                      <td className="py-2.5 font-mono text-xs text-foreground/50">
                        {job.duration}
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

/**
 * Watchtower overview page — /watchtower
 *
 * Server component. Fetches all project health summaries, shows a status
 * summary strip, and renders a live health card grid with SSE updates.
 * Glass Observatory styling.
 */

import { LiveHealthGrid } from "@/components/watchtower/live-health-grid";

interface ProjectHealthSummary {
  projectId: string;
  projectName: string;
  projectSlug: string;
  overallStatus: string;
  uptime30d: string | null;
  lastCheckedAt: string | null;
  components: unknown;
}

const STATUS_ORDER: Record<string, number> = {
  down: 0,
  degraded: 1,
  maintenance: 2,
  unknown: 3,
  healthy: 4,
};

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchHealthProjects(): Promise<ProjectHealthSummary[]> {
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/health/projects`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return res.json() as Promise<ProjectHealthSummary[]>;
  } catch {
    return [];
  }
}

export default async function WatchtowerPage() {
  const projects = await fetchHealthProjects();

  const sorted = [...projects].sort((a, b) => {
    const aOrder = STATUS_ORDER[a.overallStatus] ?? 3;
    const bOrder = STATUS_ORDER[b.overallStatus] ?? 3;
    return aOrder - bOrder;
  });

  const healthy = projects.filter((p) => p.overallStatus === "healthy").length;
  const degraded = projects.filter(
    (p) => p.overallStatus === "degraded"
  ).length;
  const down = projects.filter((p) => p.overallStatus === "down").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Health Overview
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground/70">
          Real-time health across all tracked projects.
        </p>
      </div>

      {/* Status summary strip */}
      {projects.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-glass-border bg-glass-bg px-5 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-sm text-foreground/80">
              {healthy} Healthy
            </span>
          </div>
          {degraded > 0 && (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              <span className="text-sm text-foreground/80">
                {degraded} Degraded
              </span>
            </div>
          )}
          {down > 0 && (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span className="text-sm text-foreground/80">{down} Down</span>
            </div>
          )}
          <span className="ml-auto text-xs text-muted-foreground/50">
            {projects.length} projects monitored
          </span>
        </div>
      )}

      <LiveHealthGrid initialProjects={sorted} />
    </div>
  );
}

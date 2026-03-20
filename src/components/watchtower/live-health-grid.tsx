"use client";

/**
 * Real-time health overview grid.
 *
 * Wraps the HealthCard grid with SSE-driven auto-refresh.
 * Receives initial data from the RSC page and subscribes to
 * "health.updated" events for live updates.
 */

import { useRealtimeData } from "@/lib/sse";
import { HealthCard } from "@/components/watchtower/health-card";

interface ProjectHealthSummary {
  projectId: string;
  projectName: string;
  projectSlug: string;
  overallStatus: string;
  uptime30d: string | null;
  components: unknown;
}

const STATUS_ORDER: Record<string, number> = {
  down: 0,
  degraded: 1,
  maintenance: 2,
  unknown: 3,
  healthy: 4,
};

function extractLatencySeries(components: unknown): number[] {
  if (!Array.isArray(components)) return [];
  return components
    .map((c) =>
      typeof c === "object" && c !== null && "latencyMs" in c
        ? Number((c as { latencyMs: unknown }).latencyMs)
        : null
    )
    .filter((v): v is number => v !== null && !isNaN(v));
}

interface LiveHealthGridProps {
  initialProjects: ProjectHealthSummary[];
}

export function LiveHealthGrid({ initialProjects }: LiveHealthGridProps) {
  const { data: projects } = useRealtimeData<ProjectHealthSummary[]>(
    initialProjects,
    "/api/health/projects",
    "health.updated"
  );

  const sorted = [...projects].sort((a, b) => {
    const aOrder = STATUS_ORDER[a.overallStatus] ?? 3;
    const bOrder = STATUS_ORDER[b.overallStatus] ?? 3;
    return aOrder - bOrder;
  });

  const healthy = sorted.filter((p) => p.overallStatus === "healthy").length;
  const degraded = sorted.filter((p) => p.overallStatus === "degraded").length;
  const down = sorted.filter((p) => p.overallStatus === "down").length;

  return (
    <>
      {/* Summary bar */}
      <div className="flex flex-wrap gap-4 rounded-xl border border-glass-border bg-glass-bg px-5 py-3">
        <SummaryCount label="Healthy" count={healthy} color="text-green-600 dark:text-green-400" />
        <SummaryCount label="Degraded" count={degraded} color="text-yellow-600 dark:text-yellow-400" />
        <SummaryCount label="Down" count={down} color="text-red-600 dark:text-red-400" />
        <SummaryCount label="Total" count={sorted.length} color="text-foreground/80" />
      </div>

      {/* Health card grid */}
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No projects are being monitored yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map((project) => (
            <HealthCard
              key={project.projectId}
              projectName={project.projectName}
              slug={project.projectSlug}
              status={project.overallStatus}
              uptime30d={project.uptime30d != null ? Number(project.uptime30d) : null}
              latencySeries={extractLatencySeries(project.components)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function SummaryCount({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`text-lg font-bold tabular-nums ${color}`}>{count}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

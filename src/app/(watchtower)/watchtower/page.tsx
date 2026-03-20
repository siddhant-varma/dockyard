/**
 * Watchtower overview page — /watchtower
 *
 * Server component. Fetches all project health summaries and passes
 * them to LiveHealthGrid for real-time SSE-driven updates.
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

async function fetchHealthProjects(): Promise<ProjectHealthSummary[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/health/projects`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) return [];
  return res.json() as Promise<ProjectHealthSummary[]>;
}

export default async function WatchtowerPage() {
  const projects = await fetchHealthProjects();

  const sorted = [...projects].sort((a, b) => {
    const aOrder = STATUS_ORDER[a.overallStatus] ?? 3;
    const bOrder = STATUS_ORDER[b.overallStatus] ?? 3;
    return aOrder - bOrder;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">
          Health Overview
        </h1>
        <p className="text-sm text-muted-foreground">
          Real-time health across all tracked projects.
        </p>
      </div>

      <LiveHealthGrid initialProjects={sorted} />
    </div>
  );
}

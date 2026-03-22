/**
 * Project Detail page — /projects/[slug]
 *
 * Server component. Two-column layout: Main (65%) + Sidebar (35%).
 * Matches Stitch "Project Alpha Overview" wireframe + WIREFRAMES.md §8.
 *
 * Main: status badges, description, phase timeline, confidence breakdown,
 *       blockers, tech stack.
 * Sidebar: activity feed.
 * Tab bar: Overview (active), Roadmap, Config, Members, SLO, Insights, Settings.
 */

import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageTabs } from "@/components/layout/page-tabs";
import { buildProjectTabs } from "@/components/projects/project-tabs";
import { PhaseTimeline } from "@/components/projects/phase-timeline";
import { ConfidenceBreakdown } from "@/components/projects/confidence-breakdown";
import { BlockerList } from "@/components/projects/blocker-list";
import { ActivityFeed } from "@/components/projects/activity-feed";
import { isDemoMode } from "@/lib/env";
import {
  DEMO_PROJECTS,
  DEMO_PHASES,
  DEMO_CONFIDENCE,
  DEMO_BLOCKERS,
  DEMO_ACTIVITY,
} from "@/lib/demo-data";
import type { ProjectSummary } from "@/components/projects/project-card";

type Params = Promise<{ slug: string }>;

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchProject(slug: string): Promise<ProjectSummary | null> {
  if (isDemoMode) {
    return DEMO_PROJECTS.find((p) => p.slug === slug) ?? null;
  }
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/projects/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json() as Promise<ProjectSummary>;
  } catch {
    return null;
  }
}

const HEALTH_DOT: Record<string, string> = {
  healthy: "bg-green-400",
  degraded: "bg-yellow-400",
  down: "bg-red-400",
  unknown: "bg-muted-foreground",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-500/20 text-green-300 border-green-500/40",
  discovered: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  paused: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  archived: "bg-white/10 text-foreground/60 border-white/15",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const project = await fetchProject(slug);

  if (!project) notFound();

  const health = project.healthStatus ?? "unknown";
  const tags = project.techStack ?? [];
  const confidencePct =
    project.confidenceScore != null
      ? Math.round(project.confidenceScore * 100)
      : null;

  const phases = isDemoMode ? DEMO_PHASES : [];
  const confidence = isDemoMode ? DEMO_CONFIDENCE : null;
  const blockers = isDemoMode ? DEMO_BLOCKERS : [];
  const activity = isDemoMode ? DEMO_ACTIVITY : [];

  return (
    <div>
      {/* Tab bar */}
      <PageTabs tabs={buildProjectTabs(slug)} />

      {/* Page header — name + status + health + confidence */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-foreground">
          {project.name}
        </h1>
        <Badge
          variant="outline"
          className={STATUS_BADGE[project.status] ?? STATUS_BADGE.archived}
        >
          {project.status}
        </Badge>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${HEALTH_DOT[health]}`} />
          <span className="text-sm capitalize text-foreground/60">
            {health}
          </span>
        </div>
        {confidencePct != null && (
          <span className="text-sm font-medium text-foreground/60">
            {confidencePct}% Confidence
          </span>
        )}
      </div>

      {/* Two-column layout: Main + Sidebar */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main column */}
        <div className="min-w-0 space-y-6">
          {/* Description */}
          {project.description && (
            <Card className="bg-card border-glass-border backdrop-blur-lg">
              <CardContent className="pt-5">
                <p className="max-w-prose text-sm leading-relaxed text-foreground/70">
                  {project.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Phase Timeline */}
          {phases.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-foreground/60">
                Phase Timeline
              </h2>
              <PhaseTimeline phases={phases} />
            </div>
          )}

          {/* Confidence Breakdown */}
          {confidence && (
            <ConfidenceBreakdown factors={confidence} />
          )}

          {/* Blockers */}
          <div>
            <h2 className="mb-3 text-sm font-medium text-foreground/60">
              Blockers ({blockers.length} active)
            </h2>
            <BlockerList blockers={blockers} />
          </div>

          {/* Tech Stack */}
          {tags.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-foreground/60">
                Tech Stack
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-glass-border bg-card/50 px-2 py-0.5 text-xs text-foreground/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar column */}
        <div className="min-w-0">
          <ActivityFeed events={activity} />
        </div>
      </div>
    </div>
  );
}

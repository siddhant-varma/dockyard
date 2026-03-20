/**
 * Project detail page — /projects/[slug]
 *
 * Server component. Fetches the project by slug and renders a full-width
 * Glass Observatory layout with a 7-tab navigation bar. The Overview tab
 * is the default view, showing the project summary with Phase 2 features
 * wired in: phase timeline, blockers, confidence breakdown, weekly AI
 * summary, activity feed, and handoff button.
 *
 * Returns a 404-style message if the project is not found.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ProjectOverview,
  type ProjectDetail,
} from "@/components/projects/project-overview";
import {
  ActivityFeed,
  type SignalEvent,
} from "@/components/projects/activity-feed";
import { ConfidenceBadge } from "@/components/projects/confidence-badge";
import { StatusBadge, HealthIndicator } from "@/components/shared";

type Params = Promise<{ slug: string }>;

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchProject(slug: string): Promise<ProjectDetail | null> {
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/projects/${slug}`, {
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json() as Promise<ProjectDetail>;
  } catch {
    return null;
  }
}

async function fetchActivity(slug: string): Promise<SignalEvent[]> {
  try {
    const res = await fetch(
      `${INTERNAL_BASE}/api/projects/${slug}/activity?limit=20`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    return res.json() as Promise<SignalEvent[]>;
  } catch {
    return [];
  }
}

/** All tabs for the project detail page. */
const TAB_ITEMS = [
  { label: "Overview", href: "" },
  { label: "Roadmap", href: "/roadmap" },
  { label: "Config", href: "/config" },
  { label: "Members", href: "/members" },
  { label: "SLO", href: "/slo" },
  { label: "Insights", href: "/insights" },
  { label: "Settings", href: "/settings" },
] as const;

export default async function ProjectDetailPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;

  const [project, activity] = await Promise.all([
    fetchProject(slug),
    fetchActivity(slug),
  ]);

  if (!project) {
    notFound();
  }

  const baseHref = `/projects/${slug}`;
  const healthStatus = project.healthStatus ?? "unknown";

  return (
    <div>
      {/* Page header — hero card with name, status, health, confidence */}
      <div className="mb-6 rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-lg">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-xl font-semibold text-foreground">
            {project.name}
          </h1>
          <StatusBadge status={project.status} />
          <HealthIndicator status={healthStatus} />
          {project.confidenceScore != null && (
            <ConfidenceBadge score={project.confidenceScore} size="md" />
          )}
        </div>
        {project.currentPhase && (
          <p className="mt-1.5 text-sm text-muted-foreground/70">
            {project.currentPhase}
          </p>
        )}
      </div>

      {/* Tab navigation — glass border bottom, blue active indicator */}
      <div className="mb-6 border-b border-glass-border">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Project tabs">
          {TAB_ITEMS.map((tab) => {
            const isOverview = tab.href === "";
            return (
              <Link
                key={tab.label}
                href={`${baseHref}${tab.href}`}
                className={`relative whitespace-nowrap px-4 pb-3 pt-1 text-sm font-medium transition-colors ${
                  isOverview
                    ? "text-[var(--color-brand-500)]"
                    : "text-muted-foreground hover:text-foreground/80"
                }`}
              >
                {tab.label}
                {isOverview && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-brand-500)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Default view: Overview + Activity sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProjectOverview project={project} />
        </div>

        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
            Recent Activity
          </h2>
          <ActivityFeed slug={slug} initialEvents={activity} />
        </div>
      </div>
    </div>
  );
}

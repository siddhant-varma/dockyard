/**
 * ProjectCard — summary card for a single project shown in the projects grid.
 *
 * Displays the project name, lifecycle status badge, current health indicator,
 * tech stack tags, and a relative "last activity" timestamp. Clicking the card
 * navigates to the project detail page at /projects/[slug].
 *
 * @param project - Project data returned from GET /api/projects.
 */

import Link from "next/link";
import { StatusBadge, HealthIndicator } from "@/components/shared";
import { ConfidenceBadge } from "./confidence-badge";

/** Shape of a project record returned by the list API. */
export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  currentPhase: string | null;
  techStack: string[] | null;
  updatedAt: string;
  /** Aggregated health status from project_health table, if available. */
  healthStatus?: string;
  /** Automated confidence score (0.00-1.00), if calculated. */
  confidenceScore?: number;
}

interface ProjectCardProps {
  project: ProjectSummary;
}

/**
 * Formats an ISO date string as a human-readable relative time label,
 * e.g. "3 days ago" or "just now".
 */
function formatRelative(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return "just now";
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
  if (diffSecs < 2592000) return `${Math.floor(diffSecs / 86400)}d ago`;
  return `${Math.floor(diffSecs / 2592000)}mo ago`;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const healthStatus = project.healthStatus ?? "unknown";
  const tags = project.techStack ?? [];

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-lg transition-all hover:bg-white/[0.06] hover:glow-primary dark:glass"
    >
      {/* Header row: name + status badge */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="truncate text-base font-semibold text-foreground group-hover:text-primary">
          {project.name}
        </h3>
        <StatusBadge status={project.status} className="shrink-0" />
      </div>

      {/* Description */}
      {project.description && (
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          {project.description}
        </p>
      )}

      {/* Health indicator + confidence */}
      <div className="mb-4 flex items-center gap-2">
        <HealthIndicator status={healthStatus} />
        {project.confidenceScore != null && (
          <ConfidenceBadge score={project.confidenceScore} />
        )}
      </div>

      {/* Tech stack tags */}
      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {tags.slice(0, 6).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs text-muted-foreground border border-white/[0.06]"
            >
              {tag}
            </span>
          ))}
          {tags.length > 6 && (
            <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-xs text-muted-foreground/60">
              +{tags.length - 6} more
            </span>
          )}
        </div>
      )}

      {/* Footer: last activity */}
      <p className="text-xs text-muted-foreground/60">
        Last activity {formatRelative(project.updatedAt)}
      </p>
    </Link>
  );
}

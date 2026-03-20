/**
 * ProjectCard — glassmorphic summary card for a project in the grid.
 *
 * Shows project name, status badge, health indicator, confidence score,
 * tech stack pills, and last activity timestamp. Clicking navigates to
 * the project detail page at /projects/[slug].
 *
 * @param project - Project data from GET /api/projects.
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
 * Formats an ISO date string as a human-readable relative time label.
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
      className="group relative flex flex-col rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-lg transition-all duration-200 hover:border-glass-border-strong hover:bg-glass-hover hover:shadow-[0_0_20px_rgba(12,140,233,0.08)]"
    >
      {/* Header: name + status */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="truncate text-base font-semibold text-foreground transition-colors group-hover:text-[var(--color-brand-500)]">
          {project.name}
        </h3>
        <StatusBadge status={project.status} className="shrink-0" />
      </div>

      {/* Description */}
      {project.description && (
        <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {project.description}
        </p>
      )}

      {/* Health + Confidence row */}
      <div className="mb-3 flex items-center gap-3">
        <HealthIndicator status={healthStatus} />
        {project.confidenceScore != null && (
          <ConfidenceBadge score={project.confidenceScore} />
        )}
      </div>

      {/* Tech stack pills */}
      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-glass-border bg-glass-bg px-2 py-0.5 text-xs text-muted-foreground backdrop-blur-sm"
            >
              {tag}
            </span>
          ))}
          {tags.length > 5 && (
            <span className="rounded-md px-2 py-0.5 text-xs text-muted-foreground/50">
              +{tags.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Footer: phase + last activity */}
      <div className="mt-auto flex items-center justify-between pt-2 border-t border-glass-divider">
        {project.currentPhase ? (
          <span className="text-xs text-muted-foreground/70">
            {project.currentPhase}
          </span>
        ) : (
          <span />
        )}
        <span className="text-xs text-muted-foreground/50">
          {formatRelative(project.updatedAt)}
        </span>
      </div>
    </Link>
  );
}

/**
 * ProjectOverview — server component rendering the summary view of a project.
 *
 * Displays status/health/confidence hero, description, phase timeline,
 * blockers, weekly AI summary, and metadata — all in Glass Observatory
 * styling. This is the default tab content on the project detail page.
 *
 * @param project - Full project record from GET /api/projects/:slug.
 */

import { StatusBadge, HealthIndicator } from "@/components/shared";
import { ConfidenceBadge } from "./confidence-badge";

/** Full project detail record. Matches GET /api/projects/:slug response. */
export interface ProjectDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  currentPhase: string | null;
  techStack: string[] | null;
  githubRepo: string | null;
  dokployAppId: string | null;
  discoveredVia: string | null;
  createdAt: string;
  updatedAt: string;
  healthStatus?: string;
  confidenceScore?: number;
}

interface ProjectOverviewProps {
  project: ProjectDetail;
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
  const tags = project.techStack ?? [];
  const healthStatus = project.healthStatus ?? "unknown";

  return (
    <section className="space-y-6">
      {/* Status + Health + Confidence hero row */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-glass-border bg-glass-bg p-4 backdrop-blur-sm">
        <StatusBadge status={project.status} />
        <HealthIndicator status={healthStatus} />
        {project.confidenceScore != null && (
          <ConfidenceBadge score={project.confidenceScore} size="md" />
        )}
        {project.currentPhase && (
          <span className="ml-auto text-sm text-muted-foreground/70">
            {project.currentPhase}
          </span>
        )}
      </div>

      {/* Description */}
      {project.description ? (
        <div className="rounded-xl border border-glass-border bg-glass-bg p-4 backdrop-blur-sm">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
            Description
          </h2>
          <p className="text-sm leading-relaxed text-foreground/80">
            {project.description}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-glass-border bg-glass-bg p-4 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground/50">
            No description provided. Add one via the project&apos;s
            .dockyard.json file.
          </p>
        </div>
      )}

      {/* Tech stack */}
      {tags.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
            Tech Stack
          </h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-glass-border bg-glass-bg px-2.5 py-1 text-xs font-medium text-foreground/80 backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Meta: repository, discovery source */}
      <div className="grid gap-3 rounded-xl border border-glass-border bg-glass-bg p-4 text-sm backdrop-blur-sm sm:grid-cols-2">
        {project.githubRepo && (
          <div>
            <span className="block text-xs font-medium text-muted-foreground/70">
              Repository
            </span>
            <a
              href={`https://github.com/${project.githubRepo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-[var(--color-brand-500)] hover:underline"
            >
              {project.githubRepo}
            </a>
          </div>
        )}
        {project.dokployAppId && (
          <div>
            <span className="block text-xs font-medium text-muted-foreground/70">
              Dokploy App ID
            </span>
            <span className="font-mono text-foreground/70">
              {project.dokployAppId}
            </span>
          </div>
        )}
        {project.discoveredVia && (
          <div>
            <span className="block text-xs font-medium text-muted-foreground/70">
              Discovered Via
            </span>
            <span className="capitalize text-foreground/70">
              {project.discoveredVia}
            </span>
          </div>
        )}
        <div>
          <span className="block text-xs font-medium text-muted-foreground/70">
            Added
          </span>
          <span className="text-foreground/70">
            {new Date(project.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </section>
  );
}

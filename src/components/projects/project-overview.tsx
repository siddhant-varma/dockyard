/**
 * ProjectOverview — server component rendering the summary view of a project.
 *
 * Displays the project description, current development phase, lifecycle status,
 * health indicator, and tech stack tags. Intended as the default tab content on
 * the project detail page.
 *
 * This is a React Server Component — it receives all data as props and performs
 * no client-side data fetching.
 *
 * @param project - Full project record returned from GET /api/projects/:slug.
 */

import { StatusBadge, HealthIndicator } from "@/components/shared";
import { ConfidenceBadge } from "./confidence-badge";

/** Full project detail record. Matches the shape returned by GET /api/projects/:slug. */
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
  /** Aggregated health status from the project_health table, if available. */
  healthStatus?: string;
  /** Automated confidence score (0.00-1.00), if calculated. */
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
      {/* Status and health row */}
      <div className="flex flex-wrap items-center gap-4">
        <StatusBadge status={project.status} />
        <HealthIndicator status={healthStatus} />
        {project.confidenceScore != null && (
          <ConfidenceBadge score={project.confidenceScore} size="md" />
        )}
      </div>

      {/* Description */}
      {project.description ? (
        <div>
          <h2 className="mb-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Description
          </h2>
          <p className="text-sm leading-relaxed text-foreground/80">
            {project.description}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground/60">
          No description provided.
        </p>
      )}

      {/* Current phase */}
      {project.currentPhase && (
        <div>
          <h2 className="mb-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Current Phase
          </h2>
          <p className="text-sm text-foreground/80">
            {project.currentPhase}
          </p>
        </div>
      )}

      {/* Tech stack */}
      {tags.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Tech Stack
          </h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-glass-hover px-2.5 py-1 text-xs font-medium text-foreground/80"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Meta: repository, discovery source */}
      <div className="grid gap-3 rounded-xl border border-glass-border bg-glass-bg p-4 text-sm sm:grid-cols-2">
        {project.githubRepo && (
          <div>
            <span className="block text-xs font-medium text-muted-foreground">
              Repository
            </span>
            <a
              href={`https://github.com/${project.githubRepo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {project.githubRepo}
            </a>
          </div>
        )}
        {project.dokployAppId && (
          <div>
            <span className="block text-xs font-medium text-muted-foreground">
              Dokploy App ID
            </span>
            <span className="font-mono text-foreground/80">
              {project.dokployAppId}
            </span>
          </div>
        )}
        {project.discoveredVia && (
          <div>
            <span className="block text-xs font-medium text-muted-foreground">
              Discovered Via
            </span>
            <span className="capitalize text-foreground/80">
              {project.discoveredVia}
            </span>
          </div>
        )}
        <div>
          <span className="block text-xs font-medium text-muted-foreground">
            Added
          </span>
          <span className="text-foreground/80">
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

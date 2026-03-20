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
      </div>

      {/* Description */}
      {project.description ? (
        <div>
          <h2 className="mb-1.5 text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
            Description
          </h2>
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            {project.description}
          </p>
        </div>
      ) : (
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          No description provided.
        </p>
      )}

      {/* Current phase */}
      {project.currentPhase && (
        <div>
          <h2 className="mb-1.5 text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
            Current Phase
          </h2>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            {project.currentPhase}
          </p>
        </div>
      )}

      {/* Tech stack */}
      {tags.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
            Tech Stack
          </h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Meta: repository, discovery source */}
      <div className="grid gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:grid-cols-2">
        {project.githubRepo && (
          <div>
            <span className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
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
            <span className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Dokploy App ID
            </span>
            <span className="font-mono text-neutral-700 dark:text-neutral-300">
              {project.dokployAppId}
            </span>
          </div>
        )}
        {project.discoveredVia && (
          <div>
            <span className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Discovered Via
            </span>
            <span className="capitalize text-neutral-700 dark:text-neutral-300">
              {project.discoveredVia}
            </span>
          </div>
        )}
        <div>
          <span className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Added
          </span>
          <span className="text-neutral-700 dark:text-neutral-300">
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

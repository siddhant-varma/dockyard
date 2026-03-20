/**
 * Projects listing page — /projects
 *
 * Server component. Fetches all projects and renders a responsive grid
 * of glassmorphic ProjectCard components with client-side search and
 * filter. Shows an empty state when no projects are discovered.
 *
 * Glass Observatory design — matches the DockYard design system.
 */

import {
  ProjectCard,
  type ProjectSummary,
} from "@/components/projects/project-card";
import { ProjectSearchFilter } from "@/components/projects/project-search-filter";
import { StaggerContainer, FadeUp } from "@/components/shared";

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchProjects(): Promise<ProjectSummary[]> {
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/projects`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<ProjectSummary[]>;
  } catch {
    return [];
  }
}

export default async function ProjectsPage() {
  const projects = await fetchProjects();

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Projects</h1>
          <p className="mt-0.5 text-sm text-muted-foreground/70">
            {projects.length === 0
              ? "No projects discovered yet"
              : projects.length === 1
                ? "1 project discovered"
                : `${projects.length} projects discovered`}
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        /* Empty state — glass card with instructions */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-glass-border-strong bg-glass-bg py-20 text-center backdrop-blur-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-glass-border bg-glass-bg">
            <svg
              className="h-6 w-6 text-muted-foreground/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </div>
          <p className="text-base font-medium text-muted-foreground">
            No projects discovered
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground/60">
            Connect a discovery source or add a project manually via Settings to
            get started.
          </p>
        </div>
      ) : (
        <ProjectSearchFilter projects={projects}>
          {(filtered) =>
            filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-glass-border bg-glass-bg py-16 text-center backdrop-blur-sm">
                <p className="text-sm text-muted-foreground">
                  No projects match your search.
                </p>
              </div>
            ) : (
              <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((project) => (
                  <FadeUp key={project.id}>
                    <ProjectCard project={project} />
                  </FadeUp>
                ))}
              </StaggerContainer>
            )
          }
        </ProjectSearchFilter>
      )}
    </div>
  );
}

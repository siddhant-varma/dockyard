/**
 * Projects Grid page — /projects
 *
 * Server component. In demo mode uses static data, otherwise fetches
 * from API. Renders a 3-column grid of glass ProjectCards.
 */

import {
  ProjectCard,
  type ProjectSummary,
} from "@/components/projects/project-card";
import { AnimatedGrid, AnimatedItem } from "@/components/layout/animated-grid";
import { isDemoMode } from "@/lib/env";
import { DEMO_PROJECTS } from "@/lib/demo-data";

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchProjects(): Promise<ProjectSummary[]> {
  if (isDemoMode) return DEMO_PROJECTS;
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
      <h1 className="mb-6 text-lg font-semibold text-foreground">
        {projects.length === 0
          ? "Projects"
          : `${projects.length} Project${projects.length === 1 ? "" : "s"}`}
      </h1>

      {projects.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center rounded-xl py-20 text-center">
          <svg
            className="mb-3 h-8 w-8 text-muted-foreground/30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <p className="text-sm text-muted-foreground">
            No projects discovered
          </p>
          <p className="mt-1 text-xs text-muted-foreground/50">
            Connect a discovery source in Settings to get started.
          </p>
        </div>
      ) : (
        <AnimatedGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <AnimatedItem key={project.id}>
              <ProjectCard project={project} />
            </AnimatedItem>
          ))}
        </AnimatedGrid>
      )}
    </div>
  );
}

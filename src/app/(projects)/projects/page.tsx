/**
 * Projects listing page — /projects
 *
 * Server component. Fetches all projects from the internal API and renders
 * them as a responsive grid of ProjectCard components. Shows an empty state
 * when no projects have been discovered yet.
 */

import {
  ProjectCard,
  type ProjectSummary,
} from "@/components/projects/project-card";
import { StaggerContainer, FadeUp } from "@/components/shared";

async function fetchProjects(): Promise<ProjectSummary[]> {
  const res = await fetch("http://localhost:3000/api/projects", {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json() as Promise<ProjectSummary[]>;
}

export default async function ProjectsPage() {
  const projects = await fetchProjects();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Projects
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {projects.length === 1
              ? "1 project"
              : `${projects.length} projects`}
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] py-20 text-center backdrop-blur-sm">
          <p className="text-base font-medium text-muted-foreground">
            No projects discovered
          </p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Connect a discovery source or add a project manually to get started.
          </p>
        </div>
      ) : (
        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <FadeUp key={project.id}>
              <ProjectCard project={project} />
            </FadeUp>
          ))}
        </StaggerContainer>
      )}
    </div>
  );
}

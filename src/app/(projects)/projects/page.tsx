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
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Projects
          </h1>
          <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
            {projects.length === 1
              ? "1 project"
              : `${projects.length} projects`}
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 py-20 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-base font-medium text-neutral-600 dark:text-neutral-400">
            No projects discovered
          </p>
          <p className="mt-1 text-sm text-neutral-400 dark:text-neutral-500">
            Connect a discovery source or add a project manually to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

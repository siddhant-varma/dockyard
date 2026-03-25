/**
 * Projects Grid page — /projects
 *
 * Server component. In demo mode uses static data, otherwise fetches
 * from API. By default only shows "active" projects; a "Show All" toggle
 * (via ?all=true search param) reveals all statuses.
 *
 * Renders a 3-column grid of glass ProjectCards.
 */

import {
  ProjectCard,
  type ProjectSummary,
} from "@/components/projects/project-card";
import { PageTabs } from "@/components/layout/page-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { AnimatedGrid, AnimatedItem } from "@/components/layout/animated-grid";
import { ProjectStatusToggle } from "@/components/projects/project-status-toggle";
import { isDemoMode, isDiagnosticMode } from "@/lib/env";
import { DEMO_PROJECTS } from "@/lib/demo-data";
import { listProjects } from "@/lib/projects/service";

async function fetchProjects(activeOnly: boolean): Promise<ProjectSummary[]> {
  if (isDemoMode && !isDiagnosticMode) return DEMO_PROJECTS;
  try {
    // Call the service directly (server component → server function).
    // Using fetch() here would lose the session cookie, causing all
    // projects to be filtered as publicOnly when auth is enabled.
    const rows = await listProjects({
      status: activeOnly ? "active" : undefined,
    });
    // Serialize Date fields to strings (DB returns Date, ProjectSummary expects string)
    return JSON.parse(JSON.stringify(rows)) as ProjectSummary[];
  } catch {
    return [];
  }
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const params = await searchParams;
  const showAll = params.all === "true";
  const projects = await fetchProjects(!showAll);

  // Build dynamic project tabs — "All" + each project name
  const projectTabs = [
    { label: "All", href: "/projects" },
    ...projects.map((p) => ({ label: p.name, href: `/projects/${p.slug}` })),
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <PageTabs tabs={projectTabs} />
        <ProjectStatusToggle showAll={showAll} />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon="folder"
          title={showAll ? "No projects discovered" : "No active projects"}
          description={
            showAll
              ? "Connect a discovery source in Settings to get started."
              : "Activate projects in Settings > Projects, or show all projects."
          }
        />
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

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
import { PageTabs } from "@/components/layout/page-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { AnimatedGrid, AnimatedItem } from "@/components/layout/animated-grid";
import { isDemoMode, isDiagnosticMode } from "@/lib/env";
import { DEMO_PROJECTS } from "@/lib/demo-data";

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchProjects(): Promise<ProjectSummary[]> {
  if (isDemoMode && !isDiagnosticMode) return DEMO_PROJECTS;
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

  // Build dynamic project tabs — "All" + each project name
  const projectTabs = [
    { label: "All", href: "/projects" },
    ...projects.map((p) => ({ label: p.name, href: `/projects/${p.slug}` })),
  ];

  return (
    <div>
      <PageTabs tabs={projectTabs} />

      {projects.length === 0 ? (
        <EmptyState
          icon="folder"
          title="No projects discovered"
          description="Connect a discovery source in Settings to get started."
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

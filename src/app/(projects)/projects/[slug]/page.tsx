/**
 * Project detail page — /projects/[slug]
 *
 * Server component. Fetches the project by slug and renders a tab navigation
 * bar (Overview, Activity, Roadmap, Config). The Overview tab is the default
 * view and renders the ProjectOverview component inline. The remaining tabs
 * link to their respective sub-pages.
 *
 * Returns a 404-style message if the project is not found.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ProjectOverview,
  type ProjectDetail,
} from "@/components/projects/project-overview";
import {
  ActivityFeed,
  type SignalEvent,
} from "@/components/projects/activity-feed";

type Params = Promise<{ slug: string }>;

async function fetchProject(slug: string): Promise<ProjectDetail | null> {
  const res = await fetch(`http://localhost:3000/api/projects/${slug}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json() as Promise<ProjectDetail>;
}

async function fetchActivity(slug: string): Promise<SignalEvent[]> {
  const res = await fetch(
    `http://localhost:3000/api/projects/${slug}/activity?limit=20`,
    { cache: "no-store" }
  );
  if (!res.ok) return [];
  return res.json() as Promise<SignalEvent[]>;
}

const TAB_ITEMS = [
  { label: "Overview", href: "" },
  { label: "Activity", href: "/activity" },
  { label: "Roadmap", href: "/roadmap" },
  { label: "Config", href: "/config" },
] as const;

export default async function ProjectDetailPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;

  const [project, activity] = await Promise.all([
    fetchProject(slug),
    fetchActivity(slug),
  ]);

  if (!project) {
    notFound();
  }

  const baseHref = `/projects/${slug}`;

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {project.name}
        </h1>
        {project.currentPhase && (
          <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
            {project.currentPhase}
          </p>
        )}
      </div>

      {/* Tab navigation */}
      <div className="mb-6 border-b border-neutral-200 dark:border-neutral-700">
        <nav className="-mb-px flex gap-6" aria-label="Project tabs">
          {TAB_ITEMS.map((tab) => (
            <Link
              key={tab.label}
              href={`${baseHref}${tab.href}`}
              className="border-b-2 border-transparent pb-3 text-sm font-medium text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-neutral-200"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Default view: Overview + recent Activity */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProjectOverview project={project} />
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Recent Activity
          </h2>
          <ActivityFeed slug={slug} initialEvents={activity} />
        </div>
      </div>
    </div>
  );
}

/**
 * Roadmap page — /projects/[slug]/roadmap
 *
 * Server component. Fetches roadmap items for a project and renders them
 * grouped by phase. Each item shows its title, status badge, and description.
 * Items without an assigned phase are grouped under "Unphased".
 */

import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/shared";

type Params = Promise<{ slug: string }>;

/** A single roadmap item record from the roadmap_items table. */
interface RoadmapItem {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  phase: string | null;
  estimatedAt: string | null;
  completedAt: string | null;
  sequenceOrder: number | null;
}

/** Minimal project shape needed to verify the project exists. */
interface ProjectStub {
  id: string;
  name: string;
  slug: string;
}

async function fetchProject(slug: string): Promise<ProjectStub | null> {
  const res = await fetch(`http://localhost:3000/api/projects/${slug}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json() as Promise<ProjectStub>;
}

async function fetchRoadmapItems(slug: string): Promise<RoadmapItem[]> {
  const res = await fetch(
    `http://localhost:3000/api/projects/${slug}/roadmap`,
    { cache: "no-store" }
  );
  if (!res.ok) return [];
  return res.json() as Promise<RoadmapItem[]>;
}

/** Groups roadmap items by their phase, preserving insertion order of phases. */
function groupByPhase(items: RoadmapItem[]): Map<string, RoadmapItem[]> {
  const grouped = new Map<string, RoadmapItem[]>();
  const sorted = [...items].sort(
    (a, b) => (a.sequenceOrder ?? 999) - (b.sequenceOrder ?? 999)
  );

  for (const item of sorted) {
    const phase = item.phase ?? "Unphased";
    const existing = grouped.get(phase);
    if (existing) {
      existing.push(item);
    } else {
      grouped.set(phase, [item]);
    }
  }
  return grouped;
}

export default async function RoadmapPage({ params }: { params: Params }) {
  const { slug } = await params;

  const [project, items] = await Promise.all([
    fetchProject(slug),
    fetchRoadmapItems(slug),
  ]);

  if (!project) {
    notFound();
  }

  const grouped = groupByPhase(items);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Roadmap
        </h1>
        <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
          {project.name}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 py-20 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-base font-medium text-neutral-600 dark:text-neutral-400">
            No roadmap items yet
          </p>
          <p className="mt-1 text-sm text-neutral-400 dark:text-neutral-500">
            Add milestones and phases to track project progress.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {Array.from(grouped.entries()).map(([phase, phaseItems]) => (
            <section key={phase}>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                {phase}
              </h2>
              <ul className="space-y-3">
                {phaseItems.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    <div className="mb-1.5 flex items-start justify-between gap-3">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {item.title}
                      </span>
                      <StatusBadge status={item.status} className="shrink-0" />
                    </div>
                    {item.description && (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {item.description}
                      </p>
                    )}
                    {item.estimatedAt && (
                      <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
                        Target:{" "}
                        {new Date(item.estimatedAt).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

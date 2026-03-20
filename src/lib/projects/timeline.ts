/**
 * Phase timeline data service for DockYard.
 *
 * Provides ordered phase progression data for timeline visualization
 * and context handoff blocks.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { roadmapItems } from "@/db/schema";

/** A phase in the project timeline. */
export interface PhaseEntry {
  name: string;
  status: "achieved" | "current" | "planned";
  startDate: string | null;
  endDate: string | null;
  itemCount: number;
  completedCount: number;
}

/**
 * Get the phase timeline for a project.
 *
 * @param projectId - The project's database ID
 * @returns Ordered array of phases with status and progress
 */
export async function getPhaseTimeline(
  projectId: string
): Promise<PhaseEntry[]> {
  const items = await db.query.roadmapItems.findMany({
    where: eq(roadmapItems.projectId, projectId),
    orderBy: (r, { asc }) => [asc(r.sequenceOrder)],
  });

  const phaseMap = new Map<
    string,
    { items: typeof items; completed: typeof items }
  >();

  for (const item of items) {
    const phase = item.phase ?? "Unphased";
    const existing = phaseMap.get(phase) ?? { items: [], completed: [] };
    existing.items.push(item);
    if (item.status === "completed") existing.completed.push(item);
    phaseMap.set(phase, existing);
  }

  const phases: PhaseEntry[] = [];

  for (const [name, data] of phaseMap) {
    const allCompleted = data.items.every((i) => i.status === "completed");
    const hasInProgress = data.items.some(
      (i) => i.status === "in_progress" || i.status === "active"
    );

    let status: PhaseEntry["status"] = "planned";
    if (allCompleted) status = "achieved";
    else if (hasInProgress || data.completed.length > 0) status = "current";

    const completedDates = data.completed
      .filter((i) => i.completedAt !== null)
      .map((i) => new Date(i.completedAt as string | Date).toISOString());

    const estimatedDates = data.items
      .filter((i) => i.estimatedAt !== null)
      .map((i) => new Date(i.estimatedAt as string | Date).toISOString());

    phases.push({
      name,
      status,
      startDate: estimatedDates.length > 0 ? estimatedDates[0] : null,
      endDate:
        completedDates.length > 0
          ? completedDates[completedDates.length - 1]
          : estimatedDates.length > 0
            ? estimatedDates[estimatedDates.length - 1]
            : null,
      itemCount: data.items.length,
      completedCount: data.completed.length,
    });
  }

  return phases;
}

/**
 * Blocker tracking service for DockYard.
 *
 * Manages blockers stored in the `blockers` JSONB field on roadmap items.
 * Each blocker has a description, severity, owner, and resolution status.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { roadmapItems } from "@/db/schema";

/** A single blocker on a roadmap item. */
export interface Blocker {
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  owner: string | null;
  created_at: string;
  resolved_at: string | null;
}

/** Blocker with its parent roadmap item context. */
export interface BlockerWithContext extends Blocker {
  itemId: string;
  itemTitle: string;
  index: number;
}

/**
 * Get all blockers for a project across all roadmap items.
 *
 * @param projectId - The project's database ID
 * @returns Array of blockers with item context, sorted by severity
 */
export async function getBlockers(
  projectId: string
): Promise<BlockerWithContext[]> {
  const items = await db.query.roadmapItems.findMany({
    where: eq(roadmapItems.projectId, projectId),
  });

  const result: BlockerWithContext[] = [];

  for (const item of items) {
    if (!item.blockers || !Array.isArray(item.blockers)) continue;
    (item.blockers as Blocker[]).forEach((blocker, index) => {
      result.push({
        ...blocker,
        itemId: item.id,
        itemTitle: item.title,
        index,
      });
    });
  }

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  result.sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4)
  );

  return result;
}

/**
 * Add a blocker to a roadmap item.
 *
 * @param itemId - The roadmap item's database ID
 * @param blocker - Blocker data (description, severity, owner)
 */
export async function addBlocker(
  itemId: string,
  blocker: Omit<Blocker, "created_at" | "resolved_at">
): Promise<void> {
  const item = await db.query.roadmapItems.findFirst({
    where: eq(roadmapItems.id, itemId),
  });
  if (!item) throw new Error("Roadmap item not found");

  const existing = (item.blockers as Blocker[]) ?? [];
  const newBlocker: Blocker = {
    ...blocker,
    created_at: new Date().toISOString(),
    resolved_at: null,
  };

  await db
    .update(roadmapItems)
    .set({ blockers: [...existing, newBlocker] })
    .where(eq(roadmapItems.id, itemId));
}

/**
 * Resolve a blocker on a roadmap item.
 *
 * @param itemId - The roadmap item's database ID
 * @param index - The blocker's index in the blockers array
 */
export async function resolveBlocker(
  itemId: string,
  index: number
): Promise<void> {
  const item = await db.query.roadmapItems.findFirst({
    where: eq(roadmapItems.id, itemId),
  });
  if (!item) throw new Error("Roadmap item not found");

  const blockers = (item.blockers as Blocker[]) ?? [];
  if (index < 0 || index >= blockers.length) {
    throw new Error("Blocker index out of range");
  }

  blockers[index] = {
    ...blockers[index],
    resolved_at: new Date().toISOString(),
  };

  await db
    .update(roadmapItems)
    .set({ blockers })
    .where(eq(roadmapItems.id, itemId));
}

/**
 * Phases/Roadmap API routes.
 *
 * GET /api/projects/:slug/phases — Returns roadmap items grouped by phase
 * for a project's roadmap view.
 */

import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission, resolveProjectId } from "@/lib/auth/permissions";
import { db } from "@/db/connection";
import { roadmapItems } from "@/db/schema";

/** Shape of a roadmap phase returned to the frontend. */
interface RoadmapPhase {
  name: string;
  status: "complete" | "in-progress" | "planned";
  items: { title: string; done: boolean }[];
}

/** Derive phase status from its items. */
function derivePhaseStatus(
  items: { done: boolean }[]
): "complete" | "in-progress" | "planned" {
  if (items.length === 0) return "planned";
  const allDone = items.every((i) => i.done);
  const anyDone = items.some((i) => i.done);
  if (allDone) return "complete";
  if (anyDone) return "in-progress";
  return "planned";
}

/** GET /api/projects/:slug/phases — List roadmap phases with items. */
export const GET = withAuthContext(async (_request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "read");

  const projectId = await resolveProjectId(slug);

  const items = await db
    .select()
    .from(roadmapItems)
    .where(eq(roadmapItems.projectId, projectId))
    .orderBy(asc(roadmapItems.sequenceOrder));

  // Group items by phase
  const phaseMap = new Map<string, { title: string; done: boolean }[]>();

  for (const item of items) {
    const phaseName = item.phase ?? "Unassigned";
    if (!phaseMap.has(phaseName)) {
      phaseMap.set(phaseName, []);
    }
    const items = phaseMap.get(phaseName) ?? [];
    items.push({
      title: item.title,
      done: item.status === "completed" || item.completedAt !== null,
    });
  }

  const phases: RoadmapPhase[] = Array.from(phaseMap.entries()).map(
    ([name, phaseItems]) => ({
      name,
      status: derivePhaseStatus(phaseItems),
      items: phaseItems,
    })
  );

  return NextResponse.json(phases);
});

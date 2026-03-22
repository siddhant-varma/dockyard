/**
 * Blockers API routes.
 *
 * GET /api/projects/:slug/blockers — List all blockers for a project.
 * POST /api/projects/:slug/blockers — Add a blocker to a roadmap item.
 */

import { NextResponse } from "next/server";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission, resolveProjectId } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/auth/audit";
import { getBlockers, addBlocker } from "@/lib/projects/blockers";

/** GET /api/projects/:slug/blockers — List blockers across all roadmap items. */
export const GET = withAuthContext(async (_request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "read");

  const projectId = await resolveProjectId(slug);
  const blockers = await getBlockers(projectId);

  return NextResponse.json(blockers);
});

/** POST /api/projects/:slug/blockers — Add a blocker to a roadmap item. */
export const POST = withAuthContext(async (request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "config.write");

  const body = (await request.json()) as {
    itemId: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    owner?: string | null;
  };

  if (!body.itemId || !body.description || !body.severity) {
    return NextResponse.json(
      { error: "itemId, description, and severity are required" },
      { status: 400 },
    );
  }

  await addBlocker(body.itemId, {
    description: body.description,
    severity: body.severity,
    owner: body.owner ?? null,
  });

  await logAudit({
    actorId: user.id,
    action: "blocker.create",
    targetType: "roadmap_item",
    targetId: body.itemId,
    diff: { description: body.description, severity: body.severity },
    request,
  });

  return NextResponse.json({ created: true }, { status: 201 });
});

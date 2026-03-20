/**
 * SLO management API routes.
 *
 * CRUD operations for Service Level Objective definitions per project.
 * Requires project_admin or superadmin role for write operations.
 */

import { NextResponse } from "next/server";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission, resolveProjectId } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/auth/audit";
import {
  createSLO,
  listSLOs,
  updateSLO,
  deleteSLO,
  type CreateSloInput,
} from "@/lib/slo/service";

/** GET /api/projects/:slug/slo — List SLOs with current budget data. */
export const GET = withAuthContext(async (_request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "read");

  const projectId = await resolveProjectId(slug);
  const slos = await listSLOs(projectId);

  return NextResponse.json(slos);
});

/** POST /api/projects/:slug/slo — Create a new SLO definition. */
export const POST = withAuthContext(async (request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "alert.manage");

  const projectId = await resolveProjectId(slug);
  const body = (await request.json()) as CreateSloInput;

  const slo = await createSLO(projectId, body);

  await logAudit({
    actorId: user.id,
    action: "slo.create",
    targetType: "slo",
    targetId: slo.id,
    request,
  });

  return NextResponse.json(slo, { status: 201 });
});

/** PUT /api/projects/:slug/slo — Update an existing SLO. */
export const PUT = withAuthContext(async (request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "alert.manage");

  const body = (await request.json()) as { id: string; targetValue?: number; windowDays?: number };

  if (!body.id) {
    return NextResponse.json({ error: "SLO id is required" }, { status: 400 });
  }

  const updated = await updateSLO(body.id, {
    targetValue: body.targetValue,
    windowDays: body.windowDays,
  });

  if (!updated) {
    return NextResponse.json({ error: "SLO not found" }, { status: 404 });
  }

  await logAudit({
    actorId: user.id,
    action: "slo.update",
    targetType: "slo",
    targetId: body.id,
    request,
  });

  return NextResponse.json(updated);
});

/** DELETE /api/projects/:slug/slo — Remove an SLO definition. */
export const DELETE = withAuthContext(async (request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "alert.manage");

  const body = (await request.json()) as { id: string };

  if (!body.id) {
    return NextResponse.json({ error: "SLO id is required" }, { status: 400 });
  }

  const deleted = await deleteSLO(body.id);
  if (!deleted) {
    return NextResponse.json({ error: "SLO not found" }, { status: 404 });
  }

  await logAudit({
    actorId: user.id,
    action: "slo.delete",
    targetType: "slo",
    targetId: body.id,
    request,
  });

  return NextResponse.json({ deleted: true });
});

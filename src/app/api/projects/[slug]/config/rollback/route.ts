/**
 * Auto-rollback configuration API.
 *
 * Manages the auto-rollback toggle and health check timeout per project.
 */

import { NextResponse } from "next/server";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission, resolveProjectId } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/auth/audit";
import {
  getRollbackConfig,
  configureAutoRollback,
  getRollbackCount,
} from "@/lib/config/rollback";

/** GET /api/projects/:slug/config/rollback — Get rollback config + history count. */
export const GET = withAuthContext(async (_request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "read");

  const projectId = await resolveProjectId(slug);
  const config = await getRollbackConfig(projectId);
  const rollbackCount = await getRollbackCount(projectId);

  return NextResponse.json({ ...config, rollbackCount });
});

/** PUT /api/projects/:slug/config/rollback — Enable/disable auto-rollback. */
export const PUT = withAuthContext(async (request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "config.write");

  const projectId = await resolveProjectId(slug);
  const body = (await request.json()) as {
    enabled: boolean;
    healthCheckTimeoutSecs?: number;
  };

  const config = await configureAutoRollback(
    projectId,
    body.enabled,
    body.healthCheckTimeoutSecs
  );

  await logAudit({
    actorId: user.id,
    action: "config.rollback.configure",
    targetType: "project",
    targetId: projectId,
    request,
  });

  return NextResponse.json(config);
});

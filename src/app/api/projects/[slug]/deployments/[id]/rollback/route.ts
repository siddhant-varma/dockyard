import { NextResponse } from "next/server";
import { triggerRollback } from "@/lib/deployments/rollback";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/auth/audit";

/** POST /api/projects/:slug/deployments/:id/rollback — Roll back to a specific deployment. */
export const POST = withAuthContext(async (request, user, context) => {
  const { slug, id } = await context.params;
  await requireProjectPermission(user.id, slug, "deploy");

  const result = await triggerRollback(slug, id, { triggeredBy: user.id });

  await logAudit({
    actorId: user.id,
    action: "deployment.rollback",
    targetType: "deployment",
    targetId: id,
    diff: { rollbackToDeploymentId: id },
    request,
  });

  return NextResponse.json(result, { status: 202 });
});

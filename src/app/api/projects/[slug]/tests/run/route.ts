import { NextResponse } from "next/server";
import { runSmokeTests } from "@/lib/tests/smoke-runner";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission, resolveProjectId } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/auth/audit";

/** POST /api/projects/:slug/tests/run — Trigger a test run. */
export const POST = withAuthContext(async (request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "test.run");
  const projectId = await resolveProjectId(slug);

  const result = await runSmokeTests(projectId);

  await logAudit({
    actorId: user.id,
    action: "test_run.trigger",
    targetType: "test_run",
    request,
  });

  return NextResponse.json(result, { status: 202 });
});

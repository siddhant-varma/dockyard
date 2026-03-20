import { NextResponse } from "next/server";
import { listTestConfigs, createTestConfig } from "@/lib/tests/config-service";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission, resolveProjectId } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/auth/audit";

/** GET /api/projects/:slug/tests/config — List test configurations. */
export const GET = withAuthContext(async (_request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "read");
  const projectId = await resolveProjectId(slug);

  const configs = await listTestConfigs(projectId);
  return NextResponse.json(configs);
});

/** POST /api/projects/:slug/tests/config — Create a test configuration. */
export const POST = withAuthContext(async (request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "test.run");
  const projectId = await resolveProjectId(slug);

  const body = (await request.json()) as Record<string, unknown>;
  const config = await createTestConfig({
    projectId,
    type: String(body.type ?? "smoke"),
    name: String(body.name ?? "Smoke Test"),
    config: body.config ?? {},
  });

  await logAudit({
    actorId: user.id,
    action: "test_config.create",
    targetType: "test_config",
    targetId: config.id,
    request,
  });

  return NextResponse.json(config, { status: 201 });
});

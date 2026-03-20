import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { alertRules, projects } from "@/db/schema";
import { withAuth } from "@/lib/auth/guards";
import { requireProjectPermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/auth/audit";

/** GET /api/alerts — List alert rules. */
export const GET = withAuth(async (request) => {
  const sp = new URL(request.url).searchParams;
  const projectSlug = sp.get("project_slug");

  let projectId: string | undefined;
  if (projectSlug) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, projectSlug),
    });
    projectId = project?.id;
  }

  const rules = await db.query.alertRules.findMany({
    where: projectId ? eq(alertRules.projectId, projectId) : undefined,
    orderBy: (r, { asc }) => [asc(r.name)],
  });

  return NextResponse.json(rules);
});

/** POST /api/alerts — Create alert rule (requires alert.manage for project-scoped rules). */
export const POST = withAuth(async (request, user) => {
  const body = (await request.json()) as Record<string, unknown>;

  if (
    !body.name ||
    !body.metric ||
    !body.operator ||
    body.threshold == null ||
    !body.severity
  ) {
    return NextResponse.json(
      { error: "name, metric, operator, threshold, and severity are required" },
      { status: 400 }
    );
  }

  // Resolve projectId from slug and check project permission if provided
  let projectId: string | undefined;
  if (body.projectSlug) {
    const slug = String(body.projectSlug);
    await requireProjectPermission(user.id, slug, "alert.manage");
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, slug),
    });
    projectId = project?.id;
  }

  const [rule] = await db
    .insert(alertRules)
    .values({
      projectId: projectId ?? null,
      name: String(body.name),
      metric: String(body.metric),
      operator: String(body.operator),
      threshold: Number(body.threshold),
      durationSecs: body.durationSecs ? Number(body.durationSecs) : undefined,
      severity: body.severity as "sev1" | "sev2" | "sev3" | "sev4",
      notificationChannels: Array.isArray(body.notificationChannels)
        ? body.notificationChannels
        : undefined,
      createdBy: user.id,
    })
    .returning();

  await logAudit({
    actorId: user.id,
    action: "alert_rule.create",
    targetType: "alert_rule",
    targetId: rule.id,
    request,
  });

  return NextResponse.json(rule, { status: 201 });
});

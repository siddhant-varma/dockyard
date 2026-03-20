import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { alertRules, projects } from "@/db/schema";
import { auth } from "@/lib/auth";

/** GET /api/alerts — List alert rules. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
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
}

/** POST /api/alerts — Create alert rule. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Resolve projectId from slug if provided
  let projectId: string | undefined;
  if (body.projectSlug) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, String(body.projectSlug)),
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
      createdBy: session.user.id,
    })
    .returning();

  return NextResponse.json(rule, { status: 201 });
}

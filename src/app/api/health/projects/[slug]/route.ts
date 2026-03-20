import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { projects, projectHealth } from "@/db/schema";
import { calculateUptime } from "@/lib/health/uptime";
import { getRecentHealthChecks } from "@/lib/health/storage";
import { withAuthContext } from "@/lib/auth/guards";

/** GET /api/health/projects/:slug — Single project health detail. */
export const GET = withAuthContext(async (_request, _user, context) => {
  const { slug } = await context.params;

  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, slug),
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const health = await db.query.projectHealth.findFirst({
    where: eq(projectHealth.projectId, project.id),
  });

  const uptime = await calculateUptime(project.id, 30);
  const recentChecks = await getRecentHealthChecks(project.id, 24, 50);

  return NextResponse.json({
    project: { id: project.id, name: project.name, slug: project.slug },
    health: health ?? { overallStatus: "unknown", components: null },
    uptime,
    recentChecks,
  });
});

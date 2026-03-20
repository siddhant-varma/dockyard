import { NextResponse } from "next/server";
import { db } from "@/db/connection";
import { eq } from "drizzle-orm";
import { projects, projectHealth } from "@/db/schema";

/** GET /api/health/projects — All projects health summary for Watchtower grid. */
export async function GET() {
  const allHealth = await db
    .select({
      projectId: projectHealth.projectId,
      overallStatus: projectHealth.overallStatus,
      uptime30d: projectHealth.uptime30d,
      lastCheckedAt: projectHealth.lastCheckedAt,
      components: projectHealth.components,
      projectName: projects.name,
      projectSlug: projects.slug,
    })
    .from(projectHealth)
    .innerJoin(projects, eq(projectHealth.projectId, projects.id));

  return NextResponse.json(allHealth);
}

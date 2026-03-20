import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/connection";
import { alertEvents, projects } from "@/db/schema";

/** GET /api/alerts/events — Active alert events. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const severity = sp.get("severity");
  const projectSlug = sp.get("project_slug");

  const conditions = [inArray(alertEvents.status, ["firing", "acknowledged"])];

  if (severity) {
    conditions.push(
      eq(alertEvents.severity, severity as "sev1" | "sev2" | "sev3" | "sev4")
    );
  }

  if (projectSlug) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, projectSlug),
    });
    if (project) {
      conditions.push(eq(alertEvents.projectId, project.id));
    }
  }

  const events = await db
    .select()
    .from(alertEvents)
    .where(and(...conditions))
    .orderBy(desc(alertEvents.triggeredAt))
    .limit(50);

  return NextResponse.json(events);
}

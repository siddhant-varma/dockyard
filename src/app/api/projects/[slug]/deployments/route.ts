import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { projects, deploymentEvents } from "@/db/schema";
import { withAuthContext } from "@/lib/auth/guards";

/** GET /api/projects/:slug/deployments — Deployment history. */
export const GET = withAuthContext(async (request, _user, context) => {
  const { slug } = await context.params;
  const sp = new URL(request.url).searchParams;
  const limit = Math.min(Number(sp.get("limit") ?? 20), 100);

  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, slug),
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const deploys = await db
    .select()
    .from(deploymentEvents)
    .where(eq(deploymentEvents.projectId, project.id))
    .orderBy(desc(deploymentEvents.deployedAt))
    .limit(limit);

  return NextResponse.json(deploys);
});

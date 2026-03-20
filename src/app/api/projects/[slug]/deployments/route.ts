import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { projects, deploymentEvents } from "@/db/schema";

type Params = Promise<{ slug: string }>;

/** GET /api/projects/:slug/deployments — Deployment history. */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { slug } = await params;
  const sp = request.nextUrl.searchParams;
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
}

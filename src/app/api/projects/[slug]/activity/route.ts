import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { projects, signalEvents } from "@/db/schema";
import { withAuthContext } from "@/lib/auth/guards";

/** GET /api/projects/:slug/activity — Paginated signal events. */
export const GET = withAuthContext(async (request, _user, context) => {
  const { slug } = await context.params;
  const sp = new URL(request.url).searchParams;
  const limit = Math.min(Number(sp.get("limit") ?? 20), 100);
  const offset = Number(sp.get("offset") ?? 0);
  const source = sp.get("source");

  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, slug),
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const conditions = [eq(signalEvents.projectId, project.id)];
  if (source) conditions.push(eq(signalEvents.source, source));

  const events = await db
    .select()
    .from(signalEvents)
    .where(and(...conditions))
    .orderBy(desc(signalEvents.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json(events);
});

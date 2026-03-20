import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db/connection";
import { testRuns } from "@/db/schema";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission, resolveProjectId } from "@/lib/auth/permissions";

/** GET /api/projects/:slug/tests/results — List paginated test run results. */
export const GET = withAuthContext(async (request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "read");
  const projectId = await resolveProjectId(slug);

  const sp = new URL(request.url).searchParams;
  const limit = Math.min(Number(sp.get("limit") ?? 20), 100);
  const offset = Math.max(0, Number(sp.get("offset") ?? 0));

  const results = await db
    .select()
    .from(testRuns)
    .where(eq(testRuns.projectId, projectId))
    .orderBy(desc(testRuns.startedAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json(results);
});

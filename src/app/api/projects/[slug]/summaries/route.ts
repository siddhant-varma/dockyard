/**
 * AI summary API for a project.
 *
 * Returns paginated weekly summaries and milestone wrap-ups
 * stored in the ai_context_snapshots table.
 */

import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db/connection";
import { aiContextSnapshots } from "@/db/schema";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission, resolveProjectId } from "@/lib/auth/permissions";

/** GET /api/projects/:slug/summaries — List AI-generated summaries. */
export const GET = withAuthContext(async (request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "read");

  const projectId = await resolveProjectId(slug);
  const sp = new URL(request.url).searchParams;
  const limit = Math.min(Number(sp.get("limit")) || 10, 50);
  const offset = Number(sp.get("offset")) || 0;

  const snapshots = await db
    .select()
    .from(aiContextSnapshots)
    .where(eq(aiContextSnapshots.projectId, projectId))
    .orderBy(desc(aiContextSnapshots.generatedAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json(snapshots);
});

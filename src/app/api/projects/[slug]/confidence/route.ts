/**
 * Confidence score API for a project.
 *
 * Returns the current confidence score with full breakdown of
 * contributing factors.
 */

import { NextResponse } from "next/server";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission, resolveProjectId } from "@/lib/auth/permissions";
import { calculateConfidence } from "@/lib/ai/confidence";

/** GET /api/projects/:slug/confidence — Get current confidence score. */
export const GET = withAuthContext(async (_request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "read");

  const projectId = await resolveProjectId(slug);
  const result = await calculateConfidence(projectId);

  return NextResponse.json(result);
});

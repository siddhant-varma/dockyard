/**
 * Health uptime API route for a project.
 *
 * Returns uptime percentage over a configurable window and
 * hourly uptime buckets for charting.
 *
 * GET /api/projects/:slug/health/uptime?days=30&bucketHours=24
 */

import { NextResponse } from "next/server";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission, resolveProjectId } from "@/lib/auth/permissions";
import { calculateUptime, getUptimeBuckets } from "@/lib/health/uptime";

/** GET /api/projects/:slug/health/uptime — Uptime percentage + hourly buckets. */
export const GET = withAuthContext(async (request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "read");

  const projectId = await resolveProjectId(slug);
  const sp = new URL(request.url).searchParams;
  const days = Number(sp.get("days") ?? "30");
  const bucketHours = Number(sp.get("bucketHours") ?? "24");

  const [uptime, buckets] = await Promise.all([
    calculateUptime(projectId, days),
    getUptimeBuckets(projectId, bucketHours),
  ]);

  return NextResponse.json({ uptime, buckets });
});

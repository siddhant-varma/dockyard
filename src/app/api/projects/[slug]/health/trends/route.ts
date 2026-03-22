/**
 * Health trends API route for a project.
 *
 * Returns hourly latency averages (for sparkline charts) and
 * recent status history for the health detail view.
 *
 * GET /api/projects/:slug/health/trends?hours=24
 */

import { NextResponse } from "next/server";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission, resolveProjectId } from "@/lib/auth/permissions";
import { getLatencyTrend, getStatusHistory } from "@/lib/health/trends";

/** GET /api/projects/:slug/health/trends — Latency trend + status history. */
export const GET = withAuthContext(async (request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "read");

  const projectId = await resolveProjectId(slug);
  const sp = new URL(request.url).searchParams;
  const hours = Number(sp.get("hours") ?? "24");

  const [latencyTrend, statusHistory] = await Promise.all([
    getLatencyTrend(projectId, hours),
    getStatusHistory(projectId),
  ]);

  return NextResponse.json({ latencyTrend, statusHistory });
});

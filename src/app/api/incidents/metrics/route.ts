/**
 * Incident metrics API route.
 *
 * Returns aggregate incident statistics: total count, breakdown by
 * severity, MTTA/MTTR, longest incident, and week-over-week trend.
 *
 * GET /api/incidents/metrics?project_id=uuid&window=30
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/guards";
import { getIncidentMetrics } from "@/lib/incidents/metrics";

/** GET /api/incidents/metrics — Aggregated incident metrics. */
export const GET = withAuth(async (request) => {
  const sp = new URL(request.url).searchParams;

  const projectId = sp.get("project_id");
  if (!projectId) {
    return NextResponse.json(
      { error: "project_id query parameter is required" },
      { status: 400 },
    );
  }

  const windowDays = Number(sp.get("window") ?? "30");
  const metrics = await getIncidentMetrics(projectId, windowDays);

  return NextResponse.json(metrics);
});

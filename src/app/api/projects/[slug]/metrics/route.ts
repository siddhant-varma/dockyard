/**
 * Metric query API route for a project.
 *
 * Exposes time-series metric data from the TimescaleDB metric_points
 * hypertable. Supports optional time-range filtering and bucket sizing.
 *
 * GET /api/projects/:slug/metrics?metric=cpu_percent&start=ISO&end=ISO
 */

import { NextResponse } from "next/server";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission, resolveProjectId } from "@/lib/auth/permissions";
import { queryMetrics } from "@/lib/metrics/query";

/** GET /api/projects/:slug/metrics — Query time-series metric data. */
export const GET = withAuthContext(async (request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "read");

  const projectId = await resolveProjectId(slug);
  const sp = new URL(request.url).searchParams;

  const metricName = sp.get("metric");
  if (!metricName) {
    return NextResponse.json(
      { error: "metric query parameter is required" },
      { status: 400 },
    );
  }

  const startParam = sp.get("start");
  const endParam = sp.get("end");

  const range =
    startParam && endParam
      ? {
          start: new Date(startParam),
          end: new Date(endParam),
        }
      : undefined;

  const series = await queryMetrics(projectId, metricName, range);

  return NextResponse.json(series);
});

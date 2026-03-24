/**
 * Health uptime API route for a project.
 *
 * Returns uptime percentage over a configurable window and
 * hourly uptime buckets for charting. When the project uses Uptime Kuma
 * monitoring, delegates uptime calculation to the Kuma API instead
 * of querying the internal TimescaleDB health_check_results table.
 *
 * GET /api/projects/:slug/health/uptime?days=30&bucketHours=24
 */

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission, resolveProjectId } from "@/lib/auth/permissions";
import { calculateUptime, getUptimeBuckets } from "@/lib/health/uptime";
import { isKumaConfigured } from "@/lib/kuma/adapter";
import { getKumaUptimeTrend } from "@/lib/kuma/uptime";
import { db } from "@/db/connection";
import { projects } from "@/db/schema";

/** GET /api/projects/:slug/health/uptime — Uptime percentage + hourly buckets. */
export const GET = withAuthContext(async (request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "read");

  const projectId = await resolveProjectId(slug);
  const sp = new URL(request.url).searchParams;
  const days = Number(sp.get("days") ?? "30");
  const bucketHours = Number(sp.get("bucketHours") ?? "24");

  // Check if this project uses Kuma monitoring
  if (isKumaConfigured()) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      columns: { monitoringSource: true },
    });

    if (
      project?.monitoringSource === "kuma" ||
      project?.monitoringSource === "both"
    ) {
      const kumaUptime = await getKumaUptimeTrend(slug, bucketHours);
      if (kumaUptime != null) {
        return NextResponse.json({
          uptime: {
            percentage: kumaUptime,
            totalChecks: 0,
            successfulChecks: 0,
            windowDays: days,
          },
          buckets: [],
          source: "kuma",
        });
      }
      // Fall through to internal if Kuma data unavailable
    }
  }

  // Default: use internal health check data
  const [uptime, buckets] = await Promise.all([
    calculateUptime(projectId, days),
    getUptimeBuckets(projectId, bucketHours),
  ]);

  return NextResponse.json({ uptime, buckets });
});

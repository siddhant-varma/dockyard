/**
 * Health check trend data for sparkline charts.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/connection";
import { healthCheckResults } from "@/db/schema";
import { createModuleLogger } from "@/lib/logger";
const log = createModuleLogger("health.trends");

/**
 * Get average latency values bucketed by hour for sparkline display.
 */
export async function getLatencyTrend(
  projectId: string,
  hours = 24
): Promise<number[]> {
  const rows = await db.execute<{ avg_latency: string }>(
    sql`
      SELECT avg(${healthCheckResults.latencyMs}) AS avg_latency
      FROM ${healthCheckResults}
      WHERE ${healthCheckResults.projectId} = ${projectId}
        AND ${healthCheckResults.checkedAt} > now() - interval '1 hour' * ${hours}
      GROUP BY time_bucket('1 hour', ${healthCheckResults.checkedAt})
      ORDER BY time_bucket('1 hour', ${healthCheckResults.checkedAt}) ASC
    `
  );

  const trend = rows.map((r) => Math.round(Number(r.avg_latency)));

  log.debug(
    { projectId, hours, buckets: trend.length },
    "Latency trend data retrieved"
  );

  return trend;
}

/**
 * Get recent status changes for a project.
 */
export async function getStatusHistory(
  projectId: string,
  limit = 10
): Promise<Array<{ status: string; checkedAt: Date }>> {
  const rows = await db
    .select({
      status: healthCheckResults.status,
      checkedAt: healthCheckResults.checkedAt,
    })
    .from(healthCheckResults)
    .where(
      and(
        eq(healthCheckResults.projectId, projectId),
        eq(healthCheckResults.component, "api")
      )
    )
    .orderBy(desc(healthCheckResults.checkedAt))
    .limit(limit);

  log.debug(
    { projectId, limit, entries: rows.length },
    "Status history retrieved"
  );

  return rows;
}

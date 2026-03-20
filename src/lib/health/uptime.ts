/**
 * Uptime percentage calculator.
 *
 * Queries health_check_results over a time window and calculates
 * the percentage of successful checks. Uses TimescaleDB time_bucket()
 * for efficient aggregation over large time ranges.
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/connection";
import { healthCheckResults } from "@/db/schema";

/** Uptime calculation result. */
export interface UptimeResult {
  /** Uptime percentage (0-100, 2 decimal places). */
  percentage: number;
  /** Total number of health checks in the window. */
  totalChecks: number;
  /** Number of successful checks (status = "ok"). */
  successfulChecks: number;
  /** Window in days that was calculated over. */
  windowDays: number;
}

/**
 * Calculate uptime percentage for a project over a time window.
 *
 * @param projectId - UUID of the project
 * @param days - Number of days to look back (default: 30)
 * @returns Uptime percentage and check counts
 */
export async function calculateUptime(
  projectId: string,
  days = 30
): Promise<UptimeResult> {
  const result = await db
    .select({
      total: sql<number>`count(*)`,
      successful: sql<number>`count(*) filter (where ${healthCheckResults.status} = 'ok')`,
    })
    .from(healthCheckResults)
    .where(
      and(
        eq(healthCheckResults.projectId, projectId),
        sql`${healthCheckResults.checkedAt} > now() - interval '${sql.raw(String(days))} days'`
      )
    );

  const total = Number(result[0]?.total ?? 0);
  const successful = Number(result[0]?.successful ?? 0);

  const percentage =
    total > 0 ? Math.round((successful / total) * 10000) / 100 : 100;

  return {
    percentage,
    totalChecks: total,
    successfulChecks: successful,
    windowDays: days,
  };
}

/**
 * Get hourly uptime buckets for charting.
 * Returns uptime percentage per hour over the given window.
 *
 * @param projectId - UUID of the project
 * @param hours - Number of hours to look back (default: 24)
 */
export async function getUptimeBuckets(
  projectId: string,
  hours = 24
): Promise<Array<{ bucket: Date; uptimePercent: number }>> {
  const rows = await db.execute<{
    bucket: Date;
    total: string;
    successful: string;
  }>(
    sql`
      SELECT
        time_bucket('1 hour', ${healthCheckResults.checkedAt}) AS bucket,
        count(*) AS total,
        count(*) FILTER (WHERE ${healthCheckResults.status} = 'ok') AS successful
      FROM ${healthCheckResults}
      WHERE ${healthCheckResults.projectId} = ${projectId}
        AND ${healthCheckResults.checkedAt} > now() - interval '${sql.raw(String(hours))} hours'
      GROUP BY bucket
      ORDER BY bucket ASC
    `
  );

  return rows.map((row) => {
    const total = Number(row.total);
    const successful = Number(row.successful);
    return {
      bucket: new Date(row.bucket),
      uptimePercent:
        total > 0 ? Math.round((successful / total) * 10000) / 100 : 100,
    };
  });
}

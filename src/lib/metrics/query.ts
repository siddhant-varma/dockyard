/**
 * Metric query service for DockYard.
 *
 * Queries the metric_points TimescaleDB hypertable with optional
 * time bucketing for efficient aggregation. Supports both "latest value"
 * lookups and time-series range queries for dashboard charting.
 *
 * Uses TimescaleDB's time_bucket() function for server-side aggregation,
 * reducing data transfer and client-side processing.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/connection";
import { metricPoints } from "@/db/schema";

/** Time range for metric queries. */
export interface MetricTimeRange {
  /** Start of the time range (inclusive). */
  start: Date;
  /** End of the time range (inclusive). */
  end: Date;
  /** Bucket size in minutes for aggregation (default: 5). */
  bucketMinutes?: number;
}

/** A time-series of metric values suitable for charting. */
export interface MetricSeriesResult {
  /** Ordered array of timestamps (one per bucket). */
  timestamps: Date[];
  /** Ordered array of average values (one per bucket). */
  values: number[];
}

/** The most recent value for a metric. */
export interface LatestMetricValue {
  /** Metric name. */
  metricName: string;
  /** Most recent value. */
  value: number;
  /** Labels associated with this specific data point. */
  labels: Record<string, string> | null;
  /** When this value was recorded. */
  recordedAt: Date;
}

/**
 * Query metric points for a project with time bucketing.
 *
 * Returns a time-series suitable for charting, with timestamps and
 * aggregated (average) values grouped into fixed-size time buckets.
 *
 * @param projectId - UUID of the project
 * @param metricName - Name of the metric (e.g., "http_requests_total")
 * @param range - Optional time range with bucket size; defaults to last 24 hours with 5-minute buckets
 * @returns Time-bucketed series with timestamps and values arrays
 */
export async function queryMetrics(
  projectId: string,
  metricName: string,
  range?: MetricTimeRange
): Promise<MetricSeriesResult> {
  const now = new Date();
  const start = range?.start ?? new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const end = range?.end ?? now;
  const bucketMinutes = range?.bucketMinutes ?? 5;

  const rows = await db.execute<{
    bucket: Date;
    avg_value: string;
  }>(
    sql`
      SELECT
        time_bucket(${`${bucketMinutes} minutes`}, recorded_at) AS bucket,
        avg(metric_value) AS avg_value
      FROM ${metricPoints}
      WHERE project_id = ${projectId}
        AND metric_name = ${metricName}
        AND recorded_at >= ${start}
        AND recorded_at <= ${end}
      GROUP BY bucket
      ORDER BY bucket ASC
    `
  );

  const timestamps: Date[] = [];
  const values: number[] = [];

  for (const row of rows) {
    timestamps.push(new Date(row.bucket));
    values.push(Number(row.avg_value));
  }

  return { timestamps, values };
}

/**
 * Get the most recent value for a specific metric.
 *
 * Useful for dashboard "current value" displays (e.g., current CPU usage,
 * active connections count).
 *
 * @param projectId - UUID of the project
 * @param metricName - Name of the metric
 * @returns Latest value or null if no data exists
 */
export async function getLatestMetricValue(
  projectId: string,
  metricName: string
): Promise<LatestMetricValue | null> {
  const result = await db
    .select()
    .from(metricPoints)
    .where(
      and(
        eq(metricPoints.projectId, projectId),
        eq(metricPoints.metricName, metricName)
      )
    )
    .orderBy(desc(metricPoints.recordedAt))
    .limit(1);

  if (result.length === 0) return null;

  const row = result[0];
  return {
    metricName: row.metricName,
    value: row.metricValue,
    labels: row.labels as Record<string, string> | null,
    recordedAt: row.recordedAt,
  };
}

/**
 * List all distinct metric names available for a project.
 *
 * Useful for populating metric picker dropdowns in the UI.
 *
 * @param projectId - UUID of the project
 * @returns Array of distinct metric names
 */
export async function listMetricNames(projectId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ metricName: metricPoints.metricName })
    .from(metricPoints)
    .where(eq(metricPoints.projectId, projectId))
    .orderBy(metricPoints.metricName);

  return rows.map((r) => r.metricName);
}

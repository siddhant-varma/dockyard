/**
 * Hetzner metrics storage service.
 *
 * Stores server metrics (CPU, disk, network) from the Hetzner Cloud API
 * into the hetzner_snapshots TimescaleDB hypertable, and retrieves
 * latest/historical values for dashboard display.
 */

import { sql } from "drizzle-orm";
import { db } from "@/db/connection";
import { hetznerSnapshots } from "@/db/schema";
import type { MetricSeries } from "@/lib/providers/types";

/**
 * Store Hetzner server metrics into the hypertable.
 *
 * @param serverId - Hetzner server ID
 * @param metricSeries - Array of metric series from HetznerClient.getServerMetrics()
 * @returns Number of data points stored
 */
export async function storeHetznerMetrics(
  serverId: string,
  metricSeries: MetricSeries[]
): Promise<number> {
  let stored = 0;

  for (const series of metricSeries) {
    if (series.dataPoints.length === 0) continue;

    const values = series.dataPoints.map((dp) => ({
      serverId,
      metricType: series.name,
      value: dp.value,
      recordedAt: dp.timestamp,
    }));

    await db.insert(hetznerSnapshots).values(values);
    stored += values.length;
  }

  return stored;
}

/**
 * Get the most recent metric values for a server.
 * Returns one value per metric type for dashboard display.
 */
export async function getLatestMetrics(
  serverId: string
): Promise<Array<{ metricType: string; value: number; recordedAt: Date }>> {
  const rows = await db.execute<{
    metric_type: string;
    value: number;
    recorded_at: Date;
  }>(
    sql`
      SELECT DISTINCT ON (metric_type)
        metric_type,
        value,
        recorded_at
      FROM ${hetznerSnapshots}
      WHERE server_id = ${serverId}
      ORDER BY metric_type, recorded_at DESC
    `
  );

  return rows.map((r) => ({
    metricType: r.metric_type,
    value: Number(r.value),
    recordedAt: new Date(r.recorded_at),
  }));
}

/**
 * Get historical metric data for charting.
 * Uses TimescaleDB time_bucket() for efficient aggregation.
 *
 * @param serverId - Hetzner server ID
 * @param metricType - Metric type (e.g., "cpu", "disk.0.iops.read")
 * @param hours - Hours to look back (default: 24)
 * @param bucketMinutes - Bucket size in minutes (default: 5)
 */
export async function getMetricHistory(
  serverId: string,
  metricType: string,
  hours = 24,
  bucketMinutes = 5
): Promise<Array<{ bucket: Date; avg: number; max: number }>> {
  const rows = await db.execute<{
    bucket: Date;
    avg_value: string;
    max_value: string;
  }>(
    sql`
      SELECT
        time_bucket(${`${bucketMinutes} minutes`}, recorded_at) AS bucket,
        avg(value) AS avg_value,
        max(value) AS max_value
      FROM ${hetznerSnapshots}
      WHERE server_id = ${serverId}
        AND metric_type = ${metricType}
        AND recorded_at > now() - interval '${sql.raw(String(hours))} hours'
      GROUP BY bucket
      ORDER BY bucket ASC
    `
  );

  return rows.map((r) => ({
    bucket: new Date(r.bucket),
    avg: Number(r.avg_value),
    max: Number(r.max_value),
  }));
}

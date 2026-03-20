/**
 * Component-level health aggregation.
 *
 * Queries the health_check_results TimescaleDB hypertable to build
 * a per-component health summary for a project. Each component
 * (e.g., "database", "cache", "api") gets its latest status,
 * average latency, and recent failure count.
 *
 * Used by the Watchtower project detail view to render
 * individual component health cards.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/connection";
import { healthCheckResults } from "@/db/schema";

/** Health summary for a single project component. */
export interface ComponentHealthSummary {
  /** Component name (e.g., "database", "cache", "api"). */
  name: string;
  /** Current status based on the most recent health check. */
  status: "ok" | "degraded" | "down";
  /** Latency in milliseconds from the most recent check. */
  latencyMs: number | null;
  /** Average latency over the lookback window. */
  avgLatencyMs: number | null;
  /** Number of checks in the lookback window. */
  checkCount: number;
  /** Number of failed checks (status = "down") in the lookback window. */
  failureCount: number;
  /** When the most recent check was performed. */
  lastCheckedAt: Date;
  /** Optional message from the most recent check. */
  message: string | null;
}

/** Default lookback window for component health aggregation (1 hour). */
const DEFAULT_LOOKBACK_HOURS = 1;

/**
 * Get per-component health status for a project.
 *
 * Queries the health_check_results hypertable for the specified lookback
 * window, groups results by component name, and returns the latest status
 * along with aggregated statistics for each component.
 *
 * @param projectId - UUID of the project
 * @param lookbackHours - Hours to look back for aggregation (default: 1)
 * @returns Array of component health summaries, sorted by name
 */
export async function getComponentHealth(
  projectId: string,
  lookbackHours = DEFAULT_LOOKBACK_HOURS
): Promise<ComponentHealthSummary[]> {
  // Get aggregated stats per component over the lookback window
  const aggregates = await db.execute<{
    component: string;
    check_count: string;
    failure_count: string;
    avg_latency: string | null;
  }>(
    sql`
      SELECT
        component,
        count(*)::text AS check_count,
        count(*) FILTER (WHERE status = 'down')::text AS failure_count,
        avg(latency_ms)::text AS avg_latency
      FROM ${healthCheckResults}
      WHERE project_id = ${projectId}
        AND checked_at > now() - interval '${sql.raw(String(lookbackHours))} hours'
      GROUP BY component
      ORDER BY component ASC
    `
  );

  if (aggregates.length === 0) return [];

  // Get the most recent check per component for current status
  const componentNames = aggregates.map((a) => a.component);
  const latestChecks = await getLatestCheckPerComponent(
    projectId,
    componentNames
  );

  // Merge aggregate stats with latest status
  return aggregates.map((agg) => {
    const latest = latestChecks.get(agg.component);

    return {
      name: agg.component,
      status: (latest?.status ?? "down") as "ok" | "degraded" | "down",
      latencyMs: latest?.latencyMs ?? null,
      avgLatencyMs: agg.avg_latency ? Math.round(Number(agg.avg_latency)) : null,
      checkCount: Number(agg.check_count),
      failureCount: Number(agg.failure_count),
      lastCheckedAt: latest?.checkedAt ?? new Date(),
      message: latest?.message ?? null,
    };
  });
}

/**
 * Fetch the most recent health check result per component.
 *
 * @param projectId - UUID of the project
 * @param componentNames - List of component names to fetch
 * @returns Map of component name to latest check result
 */
async function getLatestCheckPerComponent(
  projectId: string,
  componentNames: string[]
): Promise<
  Map<
    string,
    {
      status: string;
      latencyMs: number | null;
      checkedAt: Date;
      message: string | null;
    }
  >
> {
  const result = new Map<
    string,
    {
      status: string;
      latencyMs: number | null;
      checkedAt: Date;
      message: string | null;
    }
  >();

  // Query latest check for each component individually to ensure we get
  // the true latest per component (DISTINCT ON is Postgres-specific and efficient)
  for (const componentName of componentNames) {
    const rows = await db
      .select({
        status: healthCheckResults.status,
        latencyMs: healthCheckResults.latencyMs,
        checkedAt: healthCheckResults.checkedAt,
        message: healthCheckResults.message,
      })
      .from(healthCheckResults)
      .where(
        and(
          eq(healthCheckResults.projectId, projectId),
          eq(healthCheckResults.component, componentName)
        )
      )
      .orderBy(desc(healthCheckResults.checkedAt))
      .limit(1);

    if (rows.length > 0) {
      result.set(componentName, rows[0]);
    }
  }

  return result;
}

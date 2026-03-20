/**
 * Health result storage and aggregation.
 *
 * Stores individual health check results in the TimescaleDB hypertable,
 * and maintains the aggregate `project_health` row per project.
 *
 * Status transition rules:
 * - 3 consecutive failures → status changes to "down"
 * - 1 success after "down" → status changes to "healthy"
 * - Any degraded component → overall "degraded"
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/connection";
import { healthCheckResults, projectHealth } from "@/db/schema";
import type { HealthPollResult } from "./poller";

/** Number of consecutive failures before marking a project as down. */
const FAILURE_THRESHOLD = 3;

/**
 * Store a health check result in the hypertable and update the project's
 * aggregate health status.
 */
export async function storeHealthResult(
  result: HealthPollResult
): Promise<void> {
  // Insert per-component results into the hypertable
  if (result.components.length > 0) {
    for (const component of result.components) {
      await db.insert(healthCheckResults).values({
        projectId: result.projectId,
        component: component.name,
        status: component.status,
        latencyMs: component.latencyMs,
        responseCode: result.responseCode,
        message: component.message,
        checkedAt: result.checkedAt,
      });
    }
  } else {
    // No component breakdown — store overall result as "api" component
    await db.insert(healthCheckResults).values({
      projectId: result.projectId,
      component: "api",
      status: result.overallStatus === "ok" ? "ok" : result.overallStatus,
      latencyMs: result.latencyMs,
      responseCode: result.responseCode,
      message: result.error,
      checkedAt: result.checkedAt,
    });
  }

  // Update the aggregate project health
  await updateProjectHealth(result);
}

/**
 * Recalculate and upsert the project_health row based on the latest
 * health check result and recent history.
 */
async function updateProjectHealth(result: HealthPollResult): Promise<void> {
  const existing = await db.query.projectHealth.findFirst({
    where: eq(projectHealth.projectId, result.projectId),
  });

  const overallStatus = await determineOverallStatus(
    result.projectId,
    result.overallStatus,
    existing?.overallStatus ?? "unknown"
  );

  const componentMap: Record<string, unknown> = {};
  for (const c of result.components) {
    componentMap[c.name] = {
      status: c.status,
      latency_ms: c.latencyMs,
      message: c.message,
    };
  }

  const values = {
    projectId: result.projectId,
    overallStatus,
    components: Object.keys(componentMap).length > 0 ? componentMap : null,
    lastCheckedAt: result.checkedAt,
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(projectHealth)
      .set(values)
      .where(eq(projectHealth.id, existing.id));
  } else {
    await db.insert(projectHealth).values(values);
  }
}

/**
 * Determine the overall health status applying transition rules:
 * - 3 consecutive failures → "down"
 * - 1 success after down → "healthy"
 * - Any degraded → "degraded"
 */
async function determineOverallStatus(
  projectId: string,
  currentResult: "ok" | "degraded" | "down",
  previousOverall: string
): Promise<"healthy" | "degraded" | "down" | "unknown"> {
  if (currentResult === "ok") {
    return "healthy";
  }

  if (currentResult === "degraded") {
    return "degraded";
  }

  // currentResult === "down" — check if we have 3 consecutive failures
  const recentChecks = await db
    .select({ status: healthCheckResults.status })
    .from(healthCheckResults)
    .where(
      and(
        eq(healthCheckResults.projectId, projectId),
        eq(healthCheckResults.component, "api")
      )
    )
    .orderBy(desc(healthCheckResults.checkedAt))
    .limit(FAILURE_THRESHOLD);

  const allDown =
    recentChecks.length >= FAILURE_THRESHOLD &&
    recentChecks.every((c) => c.status === "down");

  if (allDown) {
    return "down";
  }

  // Not enough consecutive failures yet — keep previous status or degraded
  if (previousOverall === "down") return "down";
  return "degraded";
}

/**
 * Get the current project health summary.
 */
export async function getProjectHealthSummary(projectId: string) {
  return db.query.projectHealth.findFirst({
    where: eq(projectHealth.projectId, projectId),
  });
}

/**
 * Get recent health check results for a project.
 *
 * @param projectId - UUID of the project
 * @param hours - Number of hours to look back (default: 24)
 * @param limit - Max results to return (default: 100)
 */
export async function getRecentHealthChecks(
  projectId: string,
  hours = 24,
  limit = 100
) {
  return db
    .select()
    .from(healthCheckResults)
    .where(
      and(
        eq(healthCheckResults.projectId, projectId),
        sql`${healthCheckResults.checkedAt} > now() - interval '${sql.raw(String(hours))} hours'`
      )
    )
    .orderBy(desc(healthCheckResults.checkedAt))
    .limit(limit);
}

/**
 * SLO budget calculator for DockYard.
 *
 * Computes the current error budget status for an SLO by querying
 * health_check_results (for availability) or metric_points (for latency/error rate)
 * over the SLO's configured time window.
 *
 * Key metrics:
 * - **current_value**: The actual measured value over the window
 * - **budget_remaining**: Percentage of allowed violations still available (0-100%)
 * - **burn_rate**: Rate of budget consumption vs expected.
 *   1.0 = on track, 2.0 = consuming 2x faster, 14.4 = budget gone in <1h
 *
 * @see https://sre.google/workbook/alerting-on-slos/ for burn-rate theory
 */

import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "@/db/connection";
import {
  sloBudgets,
  healthCheckResults,
  metricPoints,
} from "@/db/schema";

/** Result of an SLO budget calculation. */
export interface BudgetResult {
  sloId: string;
  projectId: string;
  metricName: string;
  targetValue: number;
  currentValue: number;
  /** Percentage of error budget remaining (0-100). Negative means budget exhausted. */
  budgetRemaining: number;
  /** Consumption rate: 1.0 = on track, >1.0 = burning faster than expected. */
  burnRate: number;
  windowDays: number;
  calculatedAt: Date;
}

/**
 * Calculate the current budget status for a specific SLO.
 *
 * @param sloId - The SLO record's database ID
 * @returns Budget calculation result, or null if the SLO doesn't exist
 */
export async function calculateBudget(
  sloId: string
): Promise<BudgetResult | null> {
  const slo = await db.query.sloBudgets.findFirst({
    where: eq(sloBudgets.id, sloId),
  });

  if (!slo) return null;

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - slo.windowDays);

  let currentValue: number;

  switch (slo.metricName) {
    case "availability":
      currentValue = await calculateAvailability(slo.projectId, windowStart);
      break;
    case "latency_p99":
      currentValue = await calculateLatencyP99(slo.projectId, windowStart);
      break;
    case "error_rate":
      currentValue = await calculateErrorRate(slo.projectId, windowStart);
      break;
    default:
      currentValue = 0;
  }

  const { budgetRemaining, burnRate } = computeBudgetMetrics(
    slo.metricName,
    slo.targetValue,
    currentValue,
    slo.windowDays
  );

  const result: BudgetResult = {
    sloId: slo.id,
    projectId: slo.projectId,
    metricName: slo.metricName,
    targetValue: slo.targetValue,
    currentValue,
    budgetRemaining,
    burnRate,
    windowDays: slo.windowDays,
    calculatedAt: new Date(),
  };

  await db
    .update(sloBudgets)
    .set({
      currentValue,
      budgetRemaining,
      burnRate,
      updatedAt: new Date(),
    })
    .where(eq(sloBudgets.id, sloId));

  return result;
}

/**
 * Calculate availability percentage from health check results.
 * Availability = (successful checks / total checks) * 100
 */
async function calculateAvailability(
  projectId: string,
  since: Date
): Promise<number> {
  const rows = await db
    .select({
      total: sql<number>`count(*)`,
      successful: sql<number>`count(*) filter (where ${healthCheckResults.status} = 'ok')`,
    })
    .from(healthCheckResults)
    .where(
      and(
        eq(healthCheckResults.projectId, projectId),
        gte(healthCheckResults.checkedAt, since)
      )
    );

  const { total, successful } = rows[0] ?? { total: 0, successful: 0 };
  if (total === 0) return 100;
  return Number(((successful / total) * 100).toFixed(4));
}

/**
 * Calculate p99 latency from metric points.
 * Queries metric_points where metric_name = 'latency_ms'.
 */
async function calculateLatencyP99(
  projectId: string,
  since: Date
): Promise<number> {
  const rows = await db
    .select({
      p99: sql<number>`percentile_cont(0.99) within group (order by ${metricPoints.metricValue})`,
    })
    .from(metricPoints)
    .where(
      and(
        eq(metricPoints.projectId, projectId),
        eq(metricPoints.metricName, "latency_ms"),
        gte(metricPoints.recordedAt, since)
      )
    );

  return rows[0]?.p99 ?? 0;
}

/**
 * Calculate error rate from metric points.
 * Queries metric_points where metric_name = 'error_rate'.
 */
async function calculateErrorRate(
  projectId: string,
  since: Date
): Promise<number> {
  const rows = await db
    .select({
      avg: sql<number>`coalesce(avg(${metricPoints.metricValue}), 0)`,
    })
    .from(metricPoints)
    .where(
      and(
        eq(metricPoints.projectId, projectId),
        eq(metricPoints.metricName, "error_rate"),
        gte(metricPoints.recordedAt, since)
      )
    );

  return Number((rows[0]?.avg ?? 0).toFixed(4));
}

/**
 * Compute budget remaining and burn rate from current vs target values.
 *
 * For "higher is better" metrics (availability): budget = how much of the
 * allowed error (100 - target) has been consumed.
 *
 * For "lower is better" metrics (latency, error_rate): budget = how much
 * of the threshold has been consumed.
 */
function computeBudgetMetrics(
  metricName: string,
  target: number,
  current: number,
  windowDays: number
): { budgetRemaining: number; burnRate: number } {
  let errorBudgetTotal: number;
  let errorBudgetConsumed: number;

  if (metricName === "availability") {
    errorBudgetTotal = 100 - target;
    errorBudgetConsumed = Math.max(0, target - current);
  } else {
    errorBudgetTotal = target;
    errorBudgetConsumed = Math.max(0, current - target);
  }

  if (errorBudgetTotal <= 0) {
    return { budgetRemaining: current >= target ? 100 : 0, burnRate: 0 };
  }

  const budgetRemaining = Math.max(
    -100,
    ((errorBudgetTotal - errorBudgetConsumed) / errorBudgetTotal) * 100
  );

  const elapsedDays = Math.max(1, windowDays);
  const expectedConsumptionRate = errorBudgetTotal / elapsedDays;
  const actualConsumptionRate = errorBudgetConsumed / elapsedDays;
  const burnRate =
    expectedConsumptionRate > 0
      ? actualConsumptionRate / expectedConsumptionRate
      : 0;

  return {
    budgetRemaining: Number(budgetRemaining.toFixed(2)),
    burnRate: Number(burnRate.toFixed(2)),
  };
}

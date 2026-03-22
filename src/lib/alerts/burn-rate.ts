/**
 * Burn-rate alert integration for SLO budgets.
 *
 * Evaluates SLO burn rates against Google's multi-window thresholds
 * and fires alerts when error budgets are being consumed too quickly.
 *
 * Thresholds (from Google SRE Workbook):
 * - >14.4x burn rate = SEV1 (budget gone in <1h)
 * - >6x burn rate    = SEV2 (budget gone in <6h)
 * - >3x burn rate    = SEV3 (budget gone in <3d)
 *
 * @see https://sre.google/workbook/alerting-on-slos/#6-multiwindow-multi-burn-rate-alerts
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { sloBudgets, alertEvents, alertRules } from "@/db/schema";
import { calculateBudget } from "@/lib/slo/calculator";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("alerts.burn-rate");

/** Burn-rate threshold configuration. */
interface BurnRateThreshold {
  burnRate: number;
  severity: "sev1" | "sev2" | "sev3";
  label: string;
}

const THRESHOLDS: BurnRateThreshold[] = [
  { burnRate: 14.4, severity: "sev1", label: "Budget exhaustion in <1h" },
  { burnRate: 6, severity: "sev2", label: "Budget exhaustion in <6h" },
  { burnRate: 3, severity: "sev3", label: "Budget exhaustion in <3d" },
];

/** Result of a burn-rate alert evaluation for a single project. */
export interface BurnRateAlertResult {
  projectId: string;
  slosEvaluated: number;
  alertsFired: number;
  alerts: Array<{
    sloId: string;
    metricName: string;
    burnRate: number;
    severity: "sev1" | "sev2" | "sev3";
    message: string;
  }>;
}

/**
 * Evaluate burn-rate alerts for all SLOs belonging to a project.
 *
 * For each SLO, recalculates the budget and checks if the burn rate
 * exceeds any of the multi-window thresholds. Fires the highest-severity
 * matching alert (avoids duplicate alerts per SLO per evaluation).
 *
 * @param projectId - The project's database ID
 * @returns Evaluation results including any fired alerts
 */
export async function evaluateBurnRateAlerts(
  projectId: string
): Promise<BurnRateAlertResult> {
  const slos = await db.query.sloBudgets.findMany({
    where: eq(sloBudgets.projectId, projectId),
  });

  const result: BurnRateAlertResult = {
    projectId,
    slosEvaluated: slos.length,
    alertsFired: 0,
    alerts: [],
  };

  for (const slo of slos) {
    const budget = await calculateBudget(slo.id);
    if (!budget) continue;

    log.debug(
      { projectId, sloId: slo.id, metricName: slo.metricName, burnRate: budget.burnRate, budgetRemaining: budget.budgetRemaining },
      "burn-rate calculation"
    );

    const matchedThreshold = THRESHOLDS.find(
      (t) => budget.burnRate >= t.burnRate
    );
    if (!matchedThreshold) continue;

    const message = `SLO "${slo.metricName}" burn rate is ${budget.burnRate}x (target: ${slo.targetValue}, current: ${budget.currentValue}). ${matchedThreshold.label}.`;

    const burnRateRuleId = await getOrCreateBurnRateRule(
      projectId,
      slo.metricName,
      matchedThreshold.severity
    );

    await db.insert(alertEvents).values({
      ruleId: burnRateRuleId,
      projectId,
      severity: matchedThreshold.severity,
      status: "firing",
      message,
      context: {
        sloId: slo.id,
        metricName: slo.metricName,
        targetValue: slo.targetValue,
        currentValue: budget.currentValue,
        burnRate: budget.burnRate,
        budgetRemaining: budget.budgetRemaining,
      },
    });

    log.info(
      { projectId, sloId: slo.id, metricName: slo.metricName, burnRate: budget.burnRate, severity: matchedThreshold.severity },
      "burn-rate alert triggered"
    );

    result.alertsFired++;
    result.alerts.push({
      sloId: slo.id,
      metricName: slo.metricName,
      burnRate: budget.burnRate,
      severity: matchedThreshold.severity,
      message,
    });
  }

  return result;
}

/**
 * Get or create a synthetic alert rule for SLO burn-rate alerts.
 * These rules are auto-managed and not user-editable.
 */
async function getOrCreateBurnRateRule(
  projectId: string,
  metricName: string,
  severity: "sev1" | "sev2" | "sev3"
): Promise<string> {
  const ruleName = `slo-burn-rate:${metricName}`;

  const existing = await db.query.alertRules.findFirst({
    where: eq(alertRules.name, ruleName),
  });

  if (existing) return existing.id;

  const [rule] = await db
    .insert(alertRules)
    .values({
      projectId,
      name: ruleName,
      metric: `slo_burn_rate_${metricName}`,
      operator: ">",
      threshold: 3,
      severity,
      enabled: true,
      cooldownSecs: 300,
    })
    .returning({ id: alertRules.id });

  return rule.id;
}

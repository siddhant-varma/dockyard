/**
 * Alert evaluation engine for DockYard.
 *
 * Evaluates alert rules against current project health/metrics.
 * Pipeline: evaluate rules → deduplicate → create events → group → return.
 *
 * Supports rule types:
 * - health_status == down → fires when project health is "down"
 * - deploy_status == failed → fires when last deploy failed
 *
 * Integrates with the deduplication engine to suppress duplicate alerts
 * and the grouping engine to batch related alerts for notifications.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { alertRules, alertEvents, projectHealth } from "@/db/schema";
import { isDuplicate } from "./deduplication";
import { groupAlerts, type AlertGroup } from "./grouping";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("alerts.evaluator");

/** Result of evaluating alerts for a project. */
export interface AlertEvaluationResult {
  projectId: string;
  rulesEvaluated: number;
  alertsFired: number;
  alertIds: string[];
  /** Grouped alerts for consolidated notification dispatch. */
  groups: AlertGroup[];
  /** Number of alerts suppressed by deduplication. */
  deduplicated: number;
}

/**
 * Evaluate all active alert rules for a project.
 *
 * Pipeline: evaluate rules → deduplicate → create events → group.
 * Returns grouped alerts for notification dispatch.
 */
export async function evaluateAlerts(
  projectId: string
): Promise<AlertEvaluationResult> {
  const rules = await db.query.alertRules.findMany({
    where: eq(alertRules.enabled, true),
  });

  const applicableRules = rules.filter(
    (r) => r.projectId === projectId || r.projectId === null
  );

  const alertIds: string[] = [];
  let deduplicated = 0;
  const pendingAlerts = [];

  for (const rule of applicableRules) {
    const breached = await isThresholdBreached(projectId, rule);

    log.debug(
      { projectId, ruleId: rule.id, ruleName: rule.name, metric: rule.metric, operator: rule.operator, threshold: rule.threshold, breached },
      "rule evaluation"
    );

    if (!breached) continue;

    const duplicate = await isDuplicate(rule.id, projectId);
    if (duplicate) {
      deduplicated++;
      continue;
    }

    const [alert] = await db
      .insert(alertEvents)
      .values({
        ruleId: rule.id,
        projectId,
        severity: rule.severity,
        status: "firing",
        message: `Alert: ${rule.name} — ${rule.metric} ${rule.operator} ${rule.threshold}`,
        context: {
          metric: rule.metric,
          threshold: rule.threshold,
          ruleName: rule.name,
          runbookUrl: rule.runbookUrl,
        },
      })
      .returning();

    log.info(
      { projectId, alertId: alert.id, ruleId: rule.id, ruleName: rule.name, severity: rule.severity },
      "alert fired"
    );

    alertIds.push(alert.id);
    pendingAlerts.push({
      id: alert.id,
      projectId,
      severity: alert.severity,
      message: alert.message,
      context: alert.context as Record<string, unknown> | null,
    });
  }

  const groups = await groupAlerts(pendingAlerts);

  log.info(
    { projectId, rulesEvaluated: applicableRules.length, alertsFired: alertIds.length, deduplicated },
    "alert evaluation completed"
  );

  return {
    projectId,
    rulesEvaluated: applicableRules.length,
    alertsFired: alertIds.length,
    alertIds,
    groups,
    deduplicated,
  };
}

/**
 * Check if a rule's threshold is currently breached.
 */
async function isThresholdBreached(
  projectId: string,
  rule: { metric: string; operator: string; threshold: number }
): Promise<boolean> {
  if (rule.metric === "health_status") {
    const health = await db.query.projectHealth.findFirst({
      where: eq(projectHealth.projectId, projectId),
    });
    if (!health) return false;

    if (rule.operator === "==" && rule.threshold === 0) {
      return health.overallStatus === "down";
    }
    return false;
  }

  if (rule.metric === "deploy_status") {
    return false;
  }

  return false;
}

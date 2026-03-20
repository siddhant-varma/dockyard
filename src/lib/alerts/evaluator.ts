/**
 * Basic alert evaluation engine.
 *
 * Evaluates alert rules against current project health/metrics.
 * For MVP, supports two rule types:
 * - health_status == down → fires when project health is "down"
 * - deploy_status == failed → fires when last deploy failed
 *
 * Respects cooldown periods to prevent alert flooding.
 */

import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db/connection";
import { alertRules, alertEvents, projectHealth } from "@/db/schema";

/** Result of evaluating alerts for a project. */
export interface AlertEvaluationResult {
  projectId: string;
  rulesEvaluated: number;
  alertsFired: number;
  alertIds: string[];
}

/**
 * Evaluate all active alert rules for a project.
 * Creates Alert_Event records for breached thresholds.
 */
export async function evaluateAlerts(
  projectId: string
): Promise<AlertEvaluationResult> {
  const rules = await db.query.alertRules.findMany({
    where: and(
      eq(alertRules.enabled, true)
      // Rules scoped to this project OR global rules (null projectId)
    ),
  });

  const applicableRules = rules.filter(
    (r) => r.projectId === projectId || r.projectId === null
  );

  const alertIds: string[] = [];

  for (const rule of applicableRules) {
    const breached = await isThresholdBreached(projectId, rule);
    if (!breached) continue;

    const inCooldown = await isInCooldown(
      rule.id,
      projectId,
      rule.cooldownSecs
    );
    if (inCooldown) continue;

    const [alert] = await db
      .insert(alertEvents)
      .values({
        ruleId: rule.id,
        projectId,
        severity: rule.severity,
        status: "firing",
        message: `Alert: ${rule.name} — ${rule.metric} ${rule.operator} ${rule.threshold}`,
        context: { metric: rule.metric, threshold: rule.threshold },
      })
      .returning();

    alertIds.push(alert.id);
  }

  return {
    projectId,
    rulesEvaluated: applicableRules.length,
    alertsFired: alertIds.length,
    alertIds,
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

    // health_status == 0 means "down"
    if (rule.operator === "==" && rule.threshold === 0) {
      return health.overallStatus === "down";
    }
    return false;
  }

  if (rule.metric === "deploy_status") {
    // Check most recent deployment — not implemented in detail for MVP
    // Will be wired when deploy tracking is complete
    return false;
  }

  return false;
}

/**
 * Check if an alert is in its cooldown period.
 */
async function isInCooldown(
  ruleId: string,
  projectId: string,
  cooldownSecs: number
): Promise<boolean> {
  const cutoff = new Date(Date.now() - cooldownSecs * 1000);

  const recent = await db.query.alertEvents.findFirst({
    where: and(
      eq(alertEvents.ruleId, ruleId),
      eq(alertEvents.projectId, projectId),
      gte(alertEvents.triggeredAt, cutoff)
    ),
  });

  return recent !== undefined;
}

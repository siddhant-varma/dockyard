/**
 * Weekly alert review data service.
 *
 * Aggregates alert data over the past 7 days for weekly digests and
 * dashboard display. Provides metrics like total alerts, noise score,
 * and time-to-acknowledge averages.
 */

import { gte, eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { alertEvents, alertRules, projects } from "@/db/schema";

/** Weekly alert review summary. */
export interface WeeklyAlertReview {
  period: { start: Date; end: Date };
  totalAlerts: number;
  alertsBySeverity: Record<string, number>;
  alertsByProject: Array<{ projectId: string; projectName: string; count: number }>;
  avgTimeToAcknowledgeMinutes: number | null;
  /** Alerts auto-resolved or resolved without action / total. Higher = noisier. */
  noiseScore: number;
  mostFrequentRule: { ruleId: string; ruleName: string; count: number } | null;
}

/**
 * Generate a weekly alert review aggregation for the past 7 days.
 *
 * @returns Aggregated alert metrics for the weekly review period
 */
export async function getWeeklyAlertReview(): Promise<WeeklyAlertReview> {
  const end = new Date();
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentAlerts = await db.query.alertEvents.findMany({
    where: gte(alertEvents.triggeredAt, start),
  });

  const totalAlerts = recentAlerts.length;

  const alertsBySeverity: Record<string, number> = {};
  for (const alert of recentAlerts) {
    alertsBySeverity[alert.severity] =
      (alertsBySeverity[alert.severity] ?? 0) + 1;
  }

  const projectCounts = new Map<string, number>();
  for (const alert of recentAlerts) {
    projectCounts.set(
      alert.projectId,
      (projectCounts.get(alert.projectId) ?? 0) + 1
    );
  }

  const projectIds = [...projectCounts.keys()];
  const projectNames = new Map<string, string>();
  if (projectIds.length > 0) {
    for (const pid of projectIds) {
      const p = await db.query.projects.findFirst({
        where: eq(projects.id, pid),
        columns: { name: true },
      });
      projectNames.set(pid, p?.name ?? "Unknown");
    }
  }

  const alertsByProject = [...projectCounts.entries()]
    .map(([projectId, cnt]) => ({
      projectId,
      projectName: projectNames.get(projectId) ?? "Unknown",
      count: cnt,
    }))
    .sort((a, b) => b.count - a.count);

  let totalAckTimeMs = 0;
  let ackCount = 0;
  let autoResolvedCount = 0;

  for (const alert of recentAlerts) {
    if (alert.acknowledgedAt && alert.triggeredAt) {
      const diff =
        new Date(alert.acknowledgedAt).getTime() -
        new Date(alert.triggeredAt).getTime();
      totalAckTimeMs += diff;
      ackCount++;
    }
    if (alert.status === "auto_resolved") {
      autoResolvedCount++;
    }
  }

  const avgTimeToAcknowledgeMinutes =
    ackCount > 0 ? Math.round(totalAckTimeMs / ackCount / 60000) : null;

  const noiseScore =
    totalAlerts > 0
      ? Number((autoResolvedCount / totalAlerts).toFixed(2))
      : 0;

  const ruleCounts = new Map<string, number>();
  for (const alert of recentAlerts) {
    ruleCounts.set(alert.ruleId, (ruleCounts.get(alert.ruleId) ?? 0) + 1);
  }

  let mostFrequentRule: WeeklyAlertReview["mostFrequentRule"] = null;
  if (ruleCounts.size > 0) {
    const [topRuleId, topCount] = [...ruleCounts.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0];
    const rule = await db.query.alertRules.findFirst({
      where: eq(alertRules.id, topRuleId),
      columns: { name: true },
    });
    mostFrequentRule = {
      ruleId: topRuleId,
      ruleName: rule?.name ?? "Unknown",
      count: topCount,
    };
  }

  return {
    period: { start, end },
    totalAlerts,
    alertsBySeverity,
    alertsByProject,
    avgTimeToAcknowledgeMinutes,
    noiseScore,
    mostFrequentRule,
  };
}

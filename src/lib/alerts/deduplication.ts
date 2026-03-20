/**
 * Alert deduplication engine for DockYard.
 *
 * Prevents the same alert from firing repeatedly by checking for existing
 * firing alerts with the same rule + project combination within a configurable
 * cooldown window.
 *
 * The cooldown defaults to the rule's `cooldown_secs` setting, preventing
 * alert floods from sustained threshold breaches.
 */

import { eq, and, gte } from "drizzle-orm";
import { db } from "@/db/connection";
import { alertEvents, alertRules } from "@/db/schema";

/**
 * Check if an alert would be a duplicate of an existing firing alert.
 *
 * An alert is considered a duplicate if there is already a firing or
 * acknowledged alert for the same rule and project within the rule's
 * cooldown window.
 *
 * @param ruleId - The alert rule's database ID
 * @param projectId - The project's database ID
 * @returns True if a duplicate exists and the alert should be suppressed
 */
export async function isDuplicate(
  ruleId: string,
  projectId: string
): Promise<boolean> {
  const rule = await db.query.alertRules.findFirst({
    where: eq(alertRules.id, ruleId),
    columns: { cooldownSecs: true },
  });

  const cooldownSecs = rule?.cooldownSecs ?? 300;
  const cutoff = new Date(Date.now() - cooldownSecs * 1000);

  const existing = await db.query.alertEvents.findFirst({
    where: and(
      eq(alertEvents.ruleId, ruleId),
      eq(alertEvents.projectId, projectId),
      gte(alertEvents.triggeredAt, cutoff)
    ),
  });

  return !!existing;
}

/**
 * Find recent firing alerts for a project within a time window.
 *
 * Used by the grouping engine to batch related alerts together.
 *
 * @param projectId - The project's database ID
 * @param windowMinutes - Time window in minutes (default: 5)
 * @returns Array of recent alert events
 */
export async function getRecentFiringAlerts(
  projectId: string,
  windowMinutes = 5
) {
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);

  return db.query.alertEvents.findMany({
    where: and(
      eq(alertEvents.projectId, projectId),
      eq(alertEvents.status, "firing"),
      gte(alertEvents.triggeredAt, cutoff)
    ),
  });
}

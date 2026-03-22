/**
 * Alert escalation engine for DockYard.
 *
 * Scans for unacknowledged firing alerts and escalates them based on
 * severity and time thresholds:
 * - SEV1 unacknowledged >15 minutes → escalate
 * - SEV2 unacknowledged >2 hours → escalate
 *
 * Escalation re-sends notifications and increments the escalation level
 * on the alert event. Designed to run as an Inngest cron every 5 minutes.
 */

import { eq, and, isNull, lte } from "drizzle-orm";
import { db } from "@/db/connection";
import { alertEvents } from "@/db/schema";
import { dispatchAlert } from "@/lib/notifications/dispatcher";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("alerts.escalation");

/** Escalation rules keyed by severity. */
interface EscalationRule {
  severity: string;
  maxUnacknowledgedMinutes: number;
}

const ESCALATION_RULES: EscalationRule[] = [
  { severity: "sev1", maxUnacknowledgedMinutes: 15 },
  { severity: "sev2", maxUnacknowledgedMinutes: 120 },
];

/** Result of an escalation check run. */
export interface EscalationResult {
  checked: number;
  escalated: number;
  escalatedAlerts: string[];
}

/**
 * Check all firing alerts and escalate any that have exceeded their
 * severity-specific time threshold without being acknowledged.
 *
 * @returns Summary of alerts checked and escalated
 */
export async function checkEscalations(): Promise<EscalationResult> {
  const result: EscalationResult = {
    checked: 0,
    escalated: 0,
    escalatedAlerts: [],
  };

  for (const rule of ESCALATION_RULES) {
    const cutoff = new Date(
      Date.now() - rule.maxUnacknowledgedMinutes * 60 * 1000
    );

    const unacknowledged = await db.query.alertEvents.findMany({
      where: and(
        eq(alertEvents.status, "firing"),
        eq(alertEvents.severity, rule.severity as "sev1" | "sev2"),
        isNull(alertEvents.acknowledgedAt),
        lte(alertEvents.triggeredAt, cutoff)
      ),
    });

    result.checked += unacknowledged.length;

    for (const alert of unacknowledged) {
      await db
        .update(alertEvents)
        .set({
          escalationLvl: alert.escalationLvl + 1,
        })
        .where(eq(alertEvents.id, alert.id));

      log.info(
        { alertId: alert.id, severity: alert.severity, escalationLvl: alert.escalationLvl + 1, projectId: alert.projectId },
        "alert escalated"
      );

      try {
        await dispatchAlert({
          id: alert.id,
          ruleId: alert.ruleId,
          projectId: alert.projectId,
          severity: alert.severity,
          message: `[ESCALATION L${alert.escalationLvl + 1}] ${alert.message ?? "Alert unacknowledged"}`,
        });
      } catch (err) {
        log.warn(
          { err, alertId: alert.id, severity: alert.severity, escalationLvl: alert.escalationLvl + 1 },
          "escalation notification dispatch failed"
        );
      }

      result.escalated++;
      result.escalatedAlerts.push(alert.id);
    }
  }

  return result;
}

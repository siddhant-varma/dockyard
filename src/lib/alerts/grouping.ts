/**
 * Alert grouping engine for DockYard.
 *
 * Groups related alerts that fire within a 5-minute window for the same
 * project into a single notification. This reduces alert noise by
 * consolidating messages like:
 *
 *   "3 alerts for Project Alpha: High error rate, Latency spike, Worker degraded"
 *
 * Each alert in a group gets a shared `group_id` stored in its context
 * field for correlation in the alert event timeline.
 */

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { alertEvents, projects } from "@/db/schema";

/** A pending alert ready for grouping. */
export interface PendingAlert {
  id: string;
  projectId: string;
  severity: string;
  message: string | null;
  context: Record<string, unknown> | null;
}

/** A group of related alerts for a single notification. */
export interface AlertGroup {
  groupId: string;
  projectId: string;
  projectName: string;
  severity: string;
  alerts: PendingAlert[];
  /** Combined notification message for the group. */
  groupMessage: string;
}

/**
 * Group pending alerts by project and assign a shared group ID.
 *
 * Alerts are grouped by project. The group's severity is the highest
 * severity among its members (sev1 > sev2 > sev3 > sev4).
 *
 * Each grouped alert's context is updated with the `groupId` for
 * later correlation in the alert timeline.
 *
 * @param pendingAlerts - Array of newly fired alerts to group
 * @returns Array of alert groups, each representing a single notification
 */
export async function groupAlerts(
  pendingAlerts: PendingAlert[]
): Promise<AlertGroup[]> {
  if (pendingAlerts.length === 0) return [];

  const byProject = new Map<string, PendingAlert[]>();
  for (const alert of pendingAlerts) {
    const existing = byProject.get(alert.projectId) ?? [];
    existing.push(alert);
    byProject.set(alert.projectId, existing);
  }

  const groups: AlertGroup[] = [];

  for (const [projectId, alerts] of byProject) {
    const groupId = randomUUID();

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      columns: { name: true },
    });
    const projectName = project?.name ?? "Unknown Project";

    const highestSeverity = resolveHighestSeverity(
      alerts.map((a) => a.severity)
    );

    const descriptions = alerts
      .map((a) => a.message ?? "Alert triggered")
      .join(", ");

    const groupMessage =
      alerts.length === 1
        ? descriptions
        : `${alerts.length} alerts for ${projectName}: ${descriptions}`;

    for (const alert of alerts) {
      await db
        .update(alertEvents)
        .set({
          context: { ...(alert.context ?? {}), groupId },
        })
        .where(eq(alertEvents.id, alert.id));
    }

    groups.push({
      groupId,
      projectId,
      projectName,
      severity: highestSeverity,
      alerts,
      groupMessage,
    });
  }

  return groups;
}

const SEVERITY_ORDER = ["sev1", "sev2", "sev3", "sev4"];

/** Resolve the highest severity from an array of severity strings. */
function resolveHighestSeverity(severities: string[]): string {
  let highest = "sev4";
  for (const sev of severities) {
    if (SEVERITY_ORDER.indexOf(sev) < SEVERITY_ORDER.indexOf(highest)) {
      highest = sev;
    }
  }
  return highest;
}

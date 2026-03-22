/**
 * Automatic incident creation from high-severity alerts.
 *
 * When a SEV1 or SEV2 alert fires, this module checks whether an open
 * incident already exists for the same project within the last 30 minutes.
 * If not, it creates a new incident and links the triggering alert.
 *
 * This avoids incident duplication during cascading alert storms while
 * ensuring critical issues always get tracked.
 */

import { eq, and, gte, inArray } from "drizzle-orm";
import { db } from "@/db/connection";
import { incidents } from "@/db/schema";
import { createIncident, addTimelineEntry } from "./service";
import { ApiError } from "@/lib/api/errors";
import { createModuleLogger } from "@/lib/logger";
const log = createModuleLogger("incidents.auto-create");

/** Shape of an alert event passed to auto-creation. */
export interface AlertEventInput {
  id: string;
  ruleId: string;
  projectId: string;
  severity: "sev1" | "sev2" | "sev3" | "sev4";
  message: string | null;
}

/** Deduplication window — incidents within this period are considered related. */
const DEDUP_WINDOW_MINUTES = 30;

/** Only SEV1 and SEV2 alerts trigger automatic incident creation. */
const AUTO_CREATE_SEVERITIES: ReadonlySet<string> = new Set(["sev1", "sev2"]);

/**
 * Auto-create an incident from a high-severity alert event.
 *
 * Rules:
 * 1. Only SEV1 and SEV2 alerts trigger auto-creation.
 * 2. If an open incident exists for the same project within the last 30 minutes,
 *    the alert is linked to it instead of creating a new incident.
 * 3. A timeline entry is added to the incident recording the alert linkage.
 *
 * @param projectId - The project that the alert belongs to
 * @param alertEvent - The fired alert event
 * @returns The incident (newly created or existing), or null if severity is too low
 */
export async function autoCreateIncident(
  projectId: string,
  alertEvent: AlertEventInput
) {
  if (!AUTO_CREATE_SEVERITIES.has(alertEvent.severity)) {
    return null;
  }

  const existing = await findRecentOpenIncident(projectId);

  if (existing) {
    log.warn(
      { projectId, alertId: alertEvent.id, existingIncidentId: existing.id },
      "Skipped auto-create — linked alert to existing open incident (duplicate)"
    );
    await linkAlertToIncident(existing.id, alertEvent);
    return existing;
  }

  const title = alertEvent.message
    ? `[${alertEvent.severity.toUpperCase()}] ${alertEvent.message}`
    : `[${alertEvent.severity.toUpperCase()}] Auto-created incident`;

  const incident = await createIncident({
    projectId,
    title,
    severity: alertEvent.severity,
    relatedAlertIds: [alertEvent.id],
  });

  await addTimelineEntry(incident.id, {
    actor: "system",
    action: "incident.auto_created",
    note: `Auto-created from alert ${alertEvent.id}`,
  });

  log.info(
    { incidentId: incident.id, projectId, alertId: alertEvent.id, severity: alertEvent.severity },
    "Auto-incident created from high-severity alert"
  );

  return incident;
}

/**
 * Find an open incident for the given project created within the dedup window.
 *
 * "Open" means any status other than "resolved" or "postmortem".
 */
async function findRecentOpenIncident(projectId: string) {
  const windowStart = new Date(
    Date.now() - DEDUP_WINDOW_MINUTES * 60 * 1000
  );

  const openStatuses = ["investigating", "identified", "monitoring"] as const;

  const result = await db.query.incidents.findFirst({
    where: and(
      eq(incidents.projectId, projectId),
      inArray(incidents.status, [...openStatuses]),
      gte(incidents.createdAt, windowStart)
    ),
    orderBy: (incidents, { desc }) => [desc(incidents.createdAt)],
  });

  return result ?? null;
}

/**
 * Link an alert event to an existing incident.
 *
 * Appends the alert ID to the incident's relatedAlerts array and
 * adds a timeline entry recording the linkage.
 */
async function linkAlertToIncident(
  incidentId: string,
  alertEvent: AlertEventInput
) {
  const incident = await db.query.incidents.findFirst({
    where: eq(incidents.id, incidentId),
  });
  if (!incident) throw new ApiError("NOT_FOUND", "Incident not found");

  const existingAlerts = (incident.relatedAlerts as string[]) ?? [];

  if (existingAlerts.includes(alertEvent.id)) {
    return;
  }

  await db
    .update(incidents)
    .set({
      relatedAlerts: [...existingAlerts, alertEvent.id],
    })
    .where(eq(incidents.id, incidentId));

  await addTimelineEntry(incidentId, {
    actor: "system",
    action: "alert.linked",
    note: `Alert ${alertEvent.id} (${alertEvent.severity}) linked to incident`,
  });
}

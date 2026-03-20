/**
 * Incident resolution service for DockYard.
 *
 * Handles the resolution lifecycle: transitioning an incident to "resolved",
 * computing Mean Time To Resolution (MTTR), and auto-resolving any related
 * alert events that are still in "firing" status.
 */

import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/db/connection";
import { incidents, alertEvents } from "@/db/schema";
import { addTimelineEntry } from "./service";
import { ApiError } from "@/lib/api/errors";

/** Statuses that indicate an alert is still active. */
const ACTIVE_ALERT_STATUSES = ["firing", "acknowledged"] as const;

/**
 * Resolve an incident.
 *
 * Transitions the incident to "resolved" status, calculates MTTR from the
 * time the incident was created to now, adds a resolution timeline entry,
 * and auto-resolves any related alert events that are still firing.
 *
 * @param incidentId - The incident to resolve
 * @param resolutionNote - Human-readable note describing the resolution
 * @returns The updated incident record
 * @throws ApiError NOT_FOUND if the incident does not exist
 * @throws ApiError BAD_REQUEST if the incident is already resolved or in postmortem
 */
export async function resolveIncident(
  incidentId: string,
  resolutionNote: string
) {
  const incident = await db.query.incidents.findFirst({
    where: eq(incidents.id, incidentId),
  });

  if (!incident) {
    throw new ApiError("NOT_FOUND", "Incident not found");
  }

  if (incident.status === "resolved" || incident.status === "postmortem") {
    throw new ApiError(
      "BAD_REQUEST",
      `Incident is already ${incident.status} — cannot resolve again`
    );
  }

  const now = new Date();
  const createdAt = new Date(incident.createdAt).getTime();
  const mttrSeconds = Math.round((now.getTime() - createdAt) / 1000);

  await db
    .update(incidents)
    .set({
      status: "resolved",
      resolvedAt: now,
      mttrSeconds,
    })
    .where(eq(incidents.id, incidentId));

  await addTimelineEntry(incidentId, {
    actor: "system",
    action: "incident.resolved",
    note: resolutionNote,
  });

  const resolvedAlerts = await resolveRelatedAlerts(incidentId);

  if (resolvedAlerts > 0) {
    await addTimelineEntry(incidentId, {
      actor: "system",
      action: "alerts.auto_resolved",
      note: `${resolvedAlerts} related alert(s) auto-resolved`,
    });
  }

  return db.query.incidents.findFirst({
    where: eq(incidents.id, incidentId),
  });
}

/**
 * Auto-resolve all active alert events linked to an incident.
 *
 * Finds all alert events referenced in the incident's relatedAlerts array
 * that are still in "firing" or "acknowledged" status, and transitions
 * them to "auto_resolved".
 *
 * @param incidentId - The incident whose related alerts should be resolved
 * @returns Number of alerts that were auto-resolved
 */
export async function resolveRelatedAlerts(incidentId: string): Promise<number> {
  const incident = await db.query.incidents.findFirst({
    where: eq(incidents.id, incidentId),
  });

  if (!incident) {
    throw new ApiError("NOT_FOUND", "Incident not found");
  }

  const relatedAlertIds = (incident.relatedAlerts as string[]) ?? [];
  if (relatedAlertIds.length === 0) {
    return 0;
  }

  const now = new Date();

  const result = await db
    .update(alertEvents)
    .set({
      status: "auto_resolved",
      resolvedAt: now,
    })
    .where(
      and(
        inArray(alertEvents.id, relatedAlertIds),
        inArray(alertEvents.status, [...ACTIVE_ALERT_STATUSES])
      )
    )
    .returning({ id: alertEvents.id });

  return result.length;
}

/**
 * Incident management service for DockYard.
 *
 * Manages the incident lifecycle: creation, timeline entries, status
 * transitions. Status flow: investigating → identified → monitoring → resolved → postmortem.
 */

import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db/connection";
import { incidents } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { createModuleLogger } from "@/lib/logger";
const log = createModuleLogger("incidents.service");

/** Timeline entry stored in the incidents.timeline JSONB array. */
export interface TimelineEntry {
  actor: string;
  action: string;
  note?: string;
  timestamp: string;
}

const STATUS_FLOW = ["investigating", "identified", "monitoring", "resolved", "postmortem"];

/** Input for creating a new incident. */
export interface CreateIncidentInput {
  projectId: string;
  title: string;
  severity: string;
  createdBy?: string;
  relatedAlertIds?: string[];
}

/**
 * Create a new incident.
 */
export async function createIncident(input: CreateIncidentInput) {
  const actor = input.createdBy ?? "system";
  const timeline: TimelineEntry[] = [
    { actor, action: "incident.created", note: input.title, timestamp: new Date().toISOString() },
  ];

  const [incident] = await db
    .insert(incidents)
    .values({
      projectId: input.projectId,
      title: input.title,
      severity: input.severity as "sev1" | "sev2" | "sev3" | "sev4",
      status: "investigating",
      timeline,
      relatedAlerts: input.relatedAlertIds ?? [],
    })
    .returning();

  log.info(
    { incidentId: incident.id, projectId: input.projectId, severity: input.severity, title: input.title },
    "Incident created"
  );

  return incident;
}

/**
 * Add a timeline entry to an incident.
 */
export async function addTimelineEntry(
  incidentId: string,
  entry: Omit<TimelineEntry, "timestamp">
) {
  const incident = await db.query.incidents.findFirst({
    where: eq(incidents.id, incidentId),
  });
  if (!incident) throw new ApiError("NOT_FOUND", "Incident not found");

  const existing = (incident.timeline as TimelineEntry[]) ?? [];
  existing.push({ ...entry, timestamp: new Date().toISOString() });

  await db
    .update(incidents)
    .set({ timeline: existing })
    .where(eq(incidents.id, incidentId));
}

/** Input for updating an incident's status. */
export interface UpdateIncidentStatusInput {
  status: string;
  note?: string;
  updatedBy?: string;
}

/**
 * Update incident status with a timeline entry.
 */
export async function updateIncidentStatus(
  incidentId: string,
  input: UpdateIncidentStatusInput
) {
  const { status: newStatus, note, updatedBy } = input;
  const actor = updatedBy ?? "system";
  const incident = await db.query.incidents.findFirst({
    where: eq(incidents.id, incidentId),
  });
  if (!incident) throw new ApiError("NOT_FOUND", "Incident not found");

  const _currentIdx = STATUS_FLOW.indexOf(incident.status);
  const newIdx = STATUS_FLOW.indexOf(newStatus);
  if (newIdx < 0) throw new ApiError("BAD_REQUEST", `Invalid status: ${newStatus}`);

  const timeline = (incident.timeline as TimelineEntry[]) ?? [];
  timeline.push({
    actor,
    action: `status.${newStatus}`,
    note: note ?? `Status changed to ${newStatus}`,
    timestamp: new Date().toISOString(),
  });

  const updates: Record<string, unknown> = { status: newStatus, timeline };
  if (newStatus === "resolved") {
    updates.resolvedAt = new Date();
    const createdAt = new Date(incident.createdAt).getTime();
    updates.mttrSeconds = Math.round((Date.now() - createdAt) / 1000);
  }

  await db.update(incidents).set(updates).where(eq(incidents.id, incidentId));

  log.info(
    { incidentId, from: incident.status, to: newStatus, actor },
    "Incident status updated"
  );

  return db.query.incidents.findFirst({ where: eq(incidents.id, incidentId) });
}

/**
 * List incidents with optional filters.
 */
export async function listIncidents(filters: {
  projectId?: string;
  status?: string;
  severity?: string;
} = {}) {
  const conditions = [];
  if (filters.projectId) conditions.push(eq(incidents.projectId, filters.projectId));
  if (filters.status) conditions.push(eq(incidents.status, filters.status as typeof incidents.status.enumValues[number]));
  if (filters.severity) conditions.push(eq(incidents.severity, filters.severity as typeof incidents.severity.enumValues[number]));

  return db.query.incidents.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: desc(incidents.createdAt),
    limit: 50,
  });
}

/**
 * Get a single incident by ID.
 */
export async function getIncident(id: string) {
  return db.query.incidents.findFirst({ where: eq(incidents.id, id) });
}

/**
 * @deprecated Use `updateIncidentStatus` instead.
 * Backward-compatible alias for updateIncidentStatus.
 */
export const updateStatus = async (
  incidentId: string,
  newStatus: string,
  note?: string,
  actor = "system"
) => updateIncidentStatus(incidentId, { status: newStatus, note, updatedBy: actor });

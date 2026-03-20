/**
 * Post-mortem generation and storage for DockYard incidents.
 *
 * Generates a template-based post-mortem document from incident data
 * (no AI SDK required). The template includes standard sections:
 * Summary, Impact, Root Cause, Detection, Response, Resolution,
 * Lessons Learned, and Action Items.
 *
 * Timeline entries drive the Detection and Response sections,
 * while metadata (severity, MTTR, related alerts) fills Summary and Impact.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { incidents } from "@/db/schema";
import { addTimelineEntry, type TimelineEntry } from "./service";
import { ApiError } from "@/lib/api/errors";

/**
 * Generate a template-based post-mortem draft from incident data.
 *
 * Pulls the incident record, extracts timeline entries, and populates
 * a structured markdown template. Fields that require human input are
 * marked with `[TODO]` placeholders.
 *
 * @param incidentId - The incident to generate a post-mortem for
 * @returns The generated markdown string
 * @throws ApiError NOT_FOUND if the incident does not exist
 */
export async function generatePostmortemDraft(
  incidentId: string
): Promise<string> {
  const incident = await db.query.incidents.findFirst({
    where: eq(incidents.id, incidentId),
  });

  if (!incident) {
    throw new ApiError("NOT_FOUND", "Incident not found");
  }

  const timeline = (incident.timeline as TimelineEntry[]) ?? [];
  const relatedAlertIds = (incident.relatedAlerts as string[]) ?? [];
  const relatedDeployIds = (incident.relatedDeploys as string[]) ?? [];

  const createdAt = new Date(incident.createdAt);
  const resolvedAt = incident.resolvedAt
    ? new Date(incident.resolvedAt)
    : null;

  const duration = resolvedAt
    ? formatDuration(resolvedAt.getTime() - createdAt.getTime())
    : "Ongoing";

  const mttr = incident.mttrSeconds
    ? formatDuration(incident.mttrSeconds * 1000)
    : "N/A";

  const timelineSection = buildTimelineSection(timeline);
  const detectionEntry = findTimelineAction(timeline, "incident.created");
  const resolutionEntry = findTimelineAction(timeline, "incident.resolved");

  const sections = [
    `# Post-Mortem: ${incident.title}`,
    "",
    `**Date:** ${createdAt.toISOString().split("T")[0]}`,
    `**Severity:** ${incident.severity.toUpperCase()}`,
    `**Status:** ${incident.status}`,
    `**Duration:** ${duration}`,
    `**MTTR:** ${mttr}`,
    "",
    "---",
    "",
    "## Summary",
    "",
    `Incident "${incident.title}" was opened on ${createdAt.toISOString()} ` +
      `with severity ${incident.severity.toUpperCase()}.` +
      (resolvedAt
        ? ` It was resolved on ${resolvedAt.toISOString()}.`
        : " It is still ongoing."),
    "",
    `- **Related Alerts:** ${relatedAlertIds.length > 0 ? relatedAlertIds.join(", ") : "None"}`,
    `- **Related Deployments:** ${relatedDeployIds.length > 0 ? relatedDeployIds.join(", ") : "None"}`,
    "",
    "## Impact",
    "",
    "[TODO] Describe the user-facing and system impact of this incident.",
    "",
    "## Root Cause",
    "",
    "[TODO] Describe the root cause of the incident.",
    "",
    "## Detection",
    "",
    detectionEntry
      ? `Incident was detected at ${detectionEntry.timestamp} via: ${detectionEntry.note ?? detectionEntry.action}`
      : "[TODO] Describe how the incident was detected.",
    "",
    "## Response Timeline",
    "",
    timelineSection || "[No timeline entries recorded]",
    "",
    "## Resolution",
    "",
    resolutionEntry
      ? `Resolved at ${resolutionEntry.timestamp}: ${resolutionEntry.note ?? "No resolution note provided."}`
      : "[TODO] Describe how the incident was resolved.",
    "",
    "## Lessons Learned",
    "",
    "### What went well",
    "",
    "- [TODO]",
    "",
    "### What could be improved",
    "",
    "- [TODO]",
    "",
    "## Action Items",
    "",
    "| Action | Owner | Due Date | Status |",
    "|--------|-------|----------|--------|",
    "| [TODO] | [TODO] | [TODO] | Open |",
    "",
  ];

  return sections.join("\n");
}

/**
 * Save a post-mortem document to an incident record.
 *
 * Stores the content in the incident's `postmortem` text field and
 * transitions the incident status to "postmortem" if it was "resolved".
 *
 * @param incidentId - The incident to attach the post-mortem to
 * @param content - The post-mortem markdown content
 * @throws ApiError NOT_FOUND if the incident does not exist
 */
export async function savePostmortem(
  incidentId: string,
  content: string
): Promise<void> {
  const incident = await db.query.incidents.findFirst({
    where: eq(incidents.id, incidentId),
  });

  if (!incident) {
    throw new ApiError("NOT_FOUND", "Incident not found");
  }

  const updates: Record<string, unknown> = { postmortem: content };

  if (incident.status === "resolved") {
    updates.status = "postmortem";
  }

  await db
    .update(incidents)
    .set(updates)
    .where(eq(incidents.id, incidentId));

  await addTimelineEntry(incidentId, {
    actor: "system",
    action: "postmortem.saved",
    note: "Post-mortem document saved",
  });
}

/**
 * Build a markdown-formatted timeline section from timeline entries.
 */
function buildTimelineSection(timeline: TimelineEntry[]): string {
  if (timeline.length === 0) return "";

  return timeline
    .map((entry) => {
      const time = entry.timestamp;
      const actor = entry.actor;
      const note = entry.note ? ` — ${entry.note}` : "";
      return `- **${time}** [${actor}] ${entry.action}${note}`;
    })
    .join("\n");
}

/**
 * Find the first timeline entry matching a given action.
 */
function findTimelineAction(
  timeline: TimelineEntry[],
  action: string
): TimelineEntry | undefined {
  return timeline.find((entry) => entry.action === action);
}

/**
 * Format a duration in milliseconds as a human-readable string.
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(" ");
}

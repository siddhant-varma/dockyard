/**
 * Incident notification service for DockYard.
 *
 * Dispatches notifications when incidents are created or resolved.
 * Severity-based routing:
 * - SEV1: All channels (email, Slack, push, webhook)
 * - SEV2: Slack + email only
 * - SEV3/SEV4: No automatic incident notifications
 *
 * Uses the alert dispatcher infrastructure to send through configured
 * notification channels.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { notificationChannels } from "@/db/schema";
import { getChannel } from "@/lib/notifications/index";
import type { NotificationPayload, SendResult } from "@/lib/notifications/types";
import { createModuleLogger } from "@/lib/logger";
const log = createModuleLogger("incidents.notifications");

/** Shape of an incident record for notification purposes. */
export interface IncidentForNotification {
  id: string;
  projectId: string;
  title: string;
  severity: "sev1" | "sev2" | "sev3" | "sev4";
  status: string;
  createdAt: Date;
  resolvedAt?: Date | null;
  mttrSeconds?: number | null;
}

/** Result of dispatching incident notifications. */
export interface IncidentNotificationResult {
  incidentId: string;
  channels: Array<{
    type: string;
    name: string;
    result: SendResult;
  }>;
}

/** Channel types allowed for each severity level. */
const SEVERITY_CHANNEL_MAP: Record<string, ReadonlySet<string>> = {
  sev1: new Set(["email", "slack", "push", "webhook"]),
  sev2: new Set(["email", "slack"]),
};

/**
 * Send notifications when a new incident is created.
 *
 * Only SEV1 and SEV2 incidents trigger notifications.
 * SEV1 uses all available channels; SEV2 uses Slack + email.
 *
 * @param incident - The newly created incident
 * @returns Dispatch results per channel
 */
export async function notifyIncidentCreated(
  incident: IncidentForNotification
): Promise<IncidentNotificationResult> {
  const payload: NotificationPayload = {
    title: `Incident Created: ${incident.title}`,
    body: buildCreatedBody(incident),
    severity: incident.severity,
    url: `/watchtower/incidents/${incident.id}`,
  };

  return dispatchToChannels(incident.id, incident.severity, payload);
}

/**
 * Send notifications when an incident is resolved.
 *
 * Only SEV1 and SEV2 incidents trigger resolution notifications.
 * SEV1 uses all available channels; SEV2 uses Slack + email.
 *
 * @param incident - The resolved incident
 * @returns Dispatch results per channel
 */
export async function notifyIncidentResolved(
  incident: IncidentForNotification
): Promise<IncidentNotificationResult> {
  const payload: NotificationPayload = {
    title: `Incident Resolved: ${incident.title}`,
    body: buildResolvedBody(incident),
    severity: incident.severity,
    url: `/watchtower/incidents/${incident.id}`,
  };

  return dispatchToChannels(incident.id, incident.severity, payload);
}

/**
 * Dispatch a notification payload to the appropriate channels based on severity.
 */
async function dispatchToChannels(
  incidentId: string,
  severity: string,
  payload: NotificationPayload
): Promise<IncidentNotificationResult> {
  const allowedTypes = SEVERITY_CHANNEL_MAP[severity];
  if (!allowedTypes) {
    return { incidentId, channels: [] };
  }

  const allChannels = await db.query.notificationChannels.findMany({
    where: eq(notificationChannels.enabled, true),
  });

  const eligibleChannels = allChannels.filter((ch) =>
    allowedTypes.has(ch.type)
  );

  const results: IncidentNotificationResult["channels"] = [];

  for (const channelConfig of eligibleChannels) {
    try {
      const channel = getChannel(
        channelConfig.type,
        channelConfig.config as Record<string, unknown>
      );
      const result = await channel.send(payload);
      results.push({
        type: channelConfig.type,
        name: channelConfig.name,
        result,
      });

      if (result.success) {
        log.info(
          { incidentId, channelType: channelConfig.type, channelName: channelConfig.name },
          "Incident notification sent"
        );
      } else {
        log.error(
          { incidentId, channelType: channelConfig.type, channelName: channelConfig.name, error: result.error },
          "Incident notification failed"
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        type: channelConfig.type,
        name: channelConfig.name,
        result: { success: false, error: message },
      });

      log.error(
        { incidentId, channelType: channelConfig.type, channelName: channelConfig.name, err },
        "Incident notification threw exception"
      );
    }
  }

  return { incidentId, channels: results };
}

/**
 * Build the notification body for a newly created incident.
 */
function buildCreatedBody(incident: IncidentForNotification): string {
  return [
    `Severity: ${incident.severity.toUpperCase()}`,
    `Status: ${incident.status}`,
    `Created: ${new Date(incident.createdAt).toISOString()}`,
    "",
    incident.title,
  ].join("\n");
}

/**
 * Build the notification body for a resolved incident.
 */
function buildResolvedBody(incident: IncidentForNotification): string {
  const lines = [
    `Severity: ${incident.severity.toUpperCase()}`,
    `Status: Resolved`,
    `Created: ${new Date(incident.createdAt).toISOString()}`,
  ];

  if (incident.resolvedAt) {
    lines.push(`Resolved: ${new Date(incident.resolvedAt).toISOString()}`);
  }

  if (incident.mttrSeconds !== null && incident.mttrSeconds !== undefined) {
    const minutes = Math.round(incident.mttrSeconds / 60);
    lines.push(`MTTR: ${minutes} minute(s)`);
  }

  lines.push("", incident.title);

  return lines.join("\n");
}

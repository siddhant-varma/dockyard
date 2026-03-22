/**
 * Alert notification dispatcher.
 *
 * When an alert fires, this service loads the notification channels
 * configured on the alert rule and dispatches the alert through each.
 * Failures in one channel don't block others.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { alertRules, notificationChannels } from "@/db/schema";
import { getChannel } from "./index";
import type { NotificationPayload, SendResult } from "./types";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("notifications.dispatcher");

/** Result of dispatching an alert to all configured channels. */
export interface DispatchResult {
  alertEventId: string;
  channels: Array<{
    type: string;
    name: string;
    result: SendResult;
  }>;
}

/**
 * Dispatch an alert event through all configured notification channels.
 *
 * @param alertEvent - The fired alert event from the evaluator
 * @returns Results per channel
 */
export async function dispatchAlert(alertEvent: {
  id: string;
  ruleId: string;
  projectId: string;
  severity: string;
  message: string | null;
}): Promise<DispatchResult> {
  // Load the alert rule to get notification channel config
  const rule = await db.query.alertRules.findFirst({
    where: eq(alertRules.id, alertEvent.ruleId),
  });

  const channelTypes = rule?.notificationChannels ?? [];
  if (channelTypes.length === 0) {
    return { alertEventId: alertEvent.id, channels: [] };
  }

  // Load all notification channel configs from DB
  const allChannels = await db.query.notificationChannels.findMany({
    where: eq(notificationChannels.enabled, true),
  });

  const payload: NotificationPayload = {
    title: rule?.name ?? "Alert",
    body: alertEvent.message ?? "An alert has been triggered.",
    severity: alertEvent.severity as NotificationPayload["severity"],
    projectSlug: undefined, // Would need project slug lookup
    url: `/watchtower/alerts`,
  };

  const results: DispatchResult["channels"] = [];

  for (const channelType of channelTypes) {
    const channelConfig = allChannels.find((c) => c.type === channelType);
    if (!channelConfig) continue;

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
          { alertEventId: alertEvent.id, channel: channelConfig.type, channelName: channelConfig.name, severity: alertEvent.severity },
          "notification sent"
        );
      } else {
        log.error(
          { alertEventId: alertEvent.id, channel: channelConfig.type, channelName: channelConfig.name, error: result.error },
          "notification dispatch failed"
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
        { err, alertEventId: alertEvent.id, channel: channelConfig.type, channelName: channelConfig.name },
        "notification dispatch failed with exception"
      );
    }
  }

  return { alertEventId: alertEvent.id, channels: results };
}

/**
 * Notification channel factory and re-exports.
 *
 * Use `getChannel(type, config)` to get a channel instance by type string.
 * This is the entry point for the alert engine to dispatch notifications.
 */

export type {
  NotificationChannel,
  NotificationPayload,
  SendResult,
} from "./types";
export { EmailChannel } from "./email";
export { SlackChannel } from "./slack";
export { PushChannel } from "./push";
export { WebhookChannel } from "./webhook";

import type { NotificationChannel } from "./types";
import { EmailChannel } from "./email";
import { SlackChannel } from "./slack";
import { PushChannel } from "./push";
import { WebhookChannel } from "./webhook";

/**
 * Factory function — returns a NotificationChannel instance for the given type.
 *
 * @param type - Channel type: "email", "slack", "push", or "webhook"
 * @param config - Channel-specific configuration (from DB `config` JSONB field)
 * @returns A NotificationChannel implementation
 * @throws Error if type is unknown
 */
export function getChannel(
  type: string,
  config: Record<string, unknown>
): NotificationChannel {
  switch (type) {
    case "email":
      return new EmailChannel(config as { email: string });
    case "slack":
      return new SlackChannel(config as { webhookUrl: string });
    case "push":
      return new PushChannel(config);
    case "webhook":
      return new WebhookChannel(config as { url: string; secret?: string });
    default:
      throw new Error(`Unknown notification channel type: ${type}`);
  }
}

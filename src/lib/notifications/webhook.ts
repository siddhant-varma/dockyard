/**
 * Generic webhook notification channel — POSTs payloads to a custom URL.
 * Full implementation pending Phase 1.
 */

import type {
  NotificationChannel,
  NotificationPayload,
  SendResult,
} from "./types";

export class WebhookChannel implements NotificationChannel {
  readonly type = "webhook" as const;

  constructor(private readonly config: { url: string; secret?: string }) {}

  async send(_payload: NotificationPayload): Promise<SendResult> {
    return { success: false, error: "Webhook channel not yet implemented" };
  }

  async validate(): Promise<boolean> {
    try {
      const url = new URL(this.config.url);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }
}

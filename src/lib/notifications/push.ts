/**
 * Web Push notification channel — sends browser push notifications.
 * Full implementation pending Phase 2 (requires Web Push API setup).
 */

import type {
  NotificationChannel,
  NotificationPayload,
  SendResult,
} from "./types";

export class PushChannel implements NotificationChannel {
  readonly type = "push" as const;

  constructor(private readonly _config: Record<string, unknown>) {}

  async send(_payload: NotificationPayload): Promise<SendResult> {
    return { success: false, error: "Push channel not yet implemented" };
  }

  async validate(): Promise<boolean> {
    return false;
  }
}

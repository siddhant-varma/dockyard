/**
 * Notification channel interface for DockYard.
 *
 * All notification channels (email, Slack, push, webhook) implement this
 * interface. The alert engine dispatches through these channels based on
 * alert rule configuration and severity-based routing.
 *
 * To add a new channel, implement NotificationChannel and register it
 * in the channel factory (index.ts).
 */

/** Severity levels matching the alert system. */
export type NotificationSeverity = "sev1" | "sev2" | "sev3" | "sev4";

/** Payload sent to a notification channel. */
export interface NotificationPayload {
  /** Short title / subject line. */
  title: string;
  /** Full notification body (plain text or markdown). */
  body: string;
  /** Alert severity level. */
  severity: NotificationSeverity;
  /** Project slug for context (optional — null for global alerts). */
  projectSlug?: string;
  /** Link to the relevant DockYard page. */
  url?: string;
  /** Arbitrary key-value metadata for channel-specific formatting. */
  metadata?: Record<string, unknown>;
}

/** Result of a send attempt. */
export interface SendResult {
  success: boolean;
  /** Provider-specific message ID for tracking. */
  messageId?: string;
  /** Error message if send failed. */
  error?: string;
}

/**
 * Abstract notification channel.
 *
 * Each channel type (email, Slack, push, webhook) implements this interface.
 * Channels are stateless — configuration comes from the NotificationChannel
 * DB record's `config` JSONB field, passed at construction time.
 */
export interface NotificationChannel {
  /** Channel type identifier. */
  readonly type: "email" | "slack" | "push" | "webhook";

  /** Send a notification through this channel. */
  send(payload: NotificationPayload): Promise<SendResult>;

  /** Validate that the channel configuration is correct and reachable. */
  validate(): Promise<boolean>;
}

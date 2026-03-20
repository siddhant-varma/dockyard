/**
 * Slack notification channel — sends alerts via incoming webhook.
 *
 * Posts a formatted message to a Slack channel using the incoming
 * webhook URL configured for this channel.
 *
 * @see https://api.slack.com/messaging/webhooks
 */

import type {
  NotificationChannel,
  NotificationPayload,
  SendResult,
} from "./types";

const SEVERITY_COLORS: Record<string, string> = {
  sev1: "#dc2626",
  sev2: "#f97316",
  sev3: "#eab308",
  sev4: "#6b7280",
};

export class SlackChannel implements NotificationChannel {
  readonly type = "slack" as const;

  constructor(private readonly config: { webhookUrl: string }) {}

  async send(payload: NotificationPayload): Promise<SendResult> {
    const color = SEVERITY_COLORS[payload.severity] ?? "#6b7280";

    const slackPayload = {
      attachments: [
        {
          color,
          title: payload.title,
          text: payload.body,
          fields: [
            ...(payload.projectSlug
              ? [{ title: "Project", value: payload.projectSlug, short: true }]
              : []),
            {
              title: "Severity",
              value: payload.severity.toUpperCase(),
              short: true,
            },
          ],
          ...(payload.url ? { title_link: payload.url } : {}),
          footer: "DockYard Watchtower",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackPayload),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        return {
          success: false,
          error: `Slack API: ${response.status} ${text}`,
        };
      }

      return { success: true, messageId: `slack-${Date.now()}` };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  async validate(): Promise<boolean> {
    return (
      typeof this.config.webhookUrl === "string" &&
      this.config.webhookUrl.startsWith("https://hooks.slack.com/")
    );
  }
}

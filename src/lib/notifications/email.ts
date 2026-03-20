/**
 * Email notification channel — sends alerts via Resend API.
 *
 * Sends HTML-formatted alert emails through the Resend
 * transactional email service.
 *
 * @see https://resend.com/docs/api-reference/emails/send-email
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

export class EmailChannel implements NotificationChannel {
  readonly type = "email" as const;

  constructor(private readonly config: { email: string }) {}

  async send(payload: NotificationPayload): Promise<SendResult> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    const color = SEVERITY_COLORS[payload.severity] ?? "#6b7280";

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${color}; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 18px;">${escapeHtml(payload.title)}</h2>
          <span style="font-size: 12px; opacity: 0.9;">${payload.severity.toUpperCase()}</span>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 16px; color: #374151; line-height: 1.6;">
            ${escapeHtml(payload.body)}
          </p>
          ${payload.projectSlug ? `<p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">Project: <strong>${escapeHtml(payload.projectSlug)}</strong></p>` : ""}
          ${payload.url ? `<a href="${escapeHtml(payload.url)}" style="display: inline-block; background: #0c8ce9; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px;">View in DockYard</a>` : ""}
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 16px; text-align: center;">
          DockYard Watchtower
        </p>
      </div>
    `;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "DockYard <notifications@dockyard.cc>",
          to: this.config.email,
          subject: `[${payload.severity.toUpperCase()}] ${payload.title}`,
          html,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        return {
          success: false,
          error: `Resend API: ${response.status} ${text}`,
        };
      }

      const data = (await response.json()) as { id?: string };
      return { success: true, messageId: data.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  async validate(): Promise<boolean> {
    return (
      typeof this.config.email === "string" && this.config.email.includes("@")
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

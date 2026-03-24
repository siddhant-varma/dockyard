/**
 * Slack webhook check — validates the webhook URL is alive.
 *
 * Sends a POST with `{"text":""}` which Slack rejects with 400 "no_text"
 * but proves the webhook URL is valid. A 404 or "invalid_token" means
 * the webhook is dead or revoked.
 *
 * @module health/checks/slack
 */

import {
  type DeepCheckResult,
  elapsed,
  errorMessage,
  CHECK_TIMEOUT_MS,
} from "./types";

/** Check that the Slack webhook URL is valid and reachable. */
export async function checkSlack(): Promise<DeepCheckResult> {
  const start = performance.now();
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      slug: "slack",
      name: "Slack Webhook",
      status: "ok",
      critical: false,
      latencyMs: elapsed(start),
      error: "Not configured (optional)",
    };
  }

  if (!webhookUrl.startsWith("https://hooks.slack.com/")) {
    return {
      slug: "slack",
      name: "Slack Webhook",
      status: "error",
      critical: false,
      latencyMs: elapsed(start),
      error: "SLACK_WEBHOOK_URL does not look like a Slack webhook",
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "" }),
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });

    // Slack returns 400 "no_text" for empty text — that's fine, it means the webhook is alive
    if (response.status === 400) {
      return {
        slug: "slack",
        name: "Slack Webhook",
        status: "ok",
        critical: false,
        latencyMs: elapsed(start),
      };
    }

    // 404 or 403 means webhook is dead/revoked
    if (response.status === 404 || response.status === 403) {
      const body = await response.text().catch(() => "");
      return {
        slug: "slack",
        name: "Slack Webhook",
        status: "error",
        critical: false,
        latencyMs: elapsed(start),
        error: `Webhook dead or revoked (HTTP ${response.status}): ${body.slice(0, 100)}`,
      };
    }

    // 200 would mean the empty text was somehow accepted (unlikely but ok)
    return {
      slug: "slack",
      name: "Slack Webhook",
      status: "ok",
      critical: false,
      latencyMs: elapsed(start),
    };
  } catch (err) {
    return {
      slug: "slack",
      name: "Slack Webhook",
      status: "error",
      critical: false,
      latencyMs: elapsed(start),
      error: errorMessage(err),
    };
  }
}

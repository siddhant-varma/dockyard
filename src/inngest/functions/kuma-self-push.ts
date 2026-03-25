/**
 * Kuma self-push reporter — Inngest cron function.
 *
 * Runs every 2 minutes. Performs a deep health check of DockYard's
 * internal components and pushes the aggregate status to Uptime Kuma's
 * push monitor endpoint.
 *
 * The push monitor in Kuma expects periodic HTTP requests; if they
 * stop arriving within the configured interval, Kuma marks DockYard
 * as DOWN and triggers notifications.
 *
 * Requires:
 * - KUMA_URL: Base URL of the Uptime Kuma instance
 * - KUMA_PUSH_TOKEN: Unique token for the push monitor
 */

import { inngest } from "../client";
import { checkDeepHealth } from "@/lib/health/deep";
import { reportSelfHealthToKuma } from "@/lib/kuma/push-reporter";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("inngest.kuma-self-push");

/**
 * Cron function that pushes DockYard's health status to Uptime Kuma
 * every 2 minutes via the push monitor API.
 */
export const kumaSelfPush = inngest.createFunction(
  {
    id: "kuma-self-push",
    name: "Kuma Self-Push Reporter",
    triggers: [{ cron: "*/2 * * * *" }],
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    const pushToken = process.env.KUMA_PUSH_TOKEN;

    if (!pushToken) {
      log.debug("KUMA_PUSH_TOKEN not set — skipping self-push");
      return { skipped: true, reason: "KUMA_PUSH_TOKEN not configured" };
    }

    if (!process.env.KUMA_URL) {
      log.debug("KUMA_URL not set — skipping self-push");
      return { skipped: true, reason: "KUMA_URL not configured" };
    }

    const result = await step.run("check-and-push", async () => {
      const health = await checkDeepHealth();

      const componentStatuses: Record<string, boolean> = {};
      for (const check of health.checks) {
        componentStatuses[check.slug] = check.status === "ok";
      }

      const pushResult = await reportSelfHealthToKuma(
        pushToken,
        componentStatuses
      );

      log.info(
        {
          overallStatus: health.status,
          pushSuccess: pushResult.success,
          pushDurationMs: pushResult.durationMs,
          components: health.checks.length,
        },
        "Self-push to Kuma completed"
      );

      return {
        healthStatus: health.status,
        componentCount: health.checks.length,
        pushSuccess: pushResult.success,
        pushDurationMs: pushResult.durationMs,
        pushError: pushResult.error,
      };
    });

    return result;
  }
);

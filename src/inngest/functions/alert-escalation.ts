/**
 * Alert escalation worker.
 *
 * Cron: runs every 5 minutes. Checks for unacknowledged firing alerts
 * that exceed their severity-specific time thresholds and re-sends
 * notifications with escalation markers.
 */

import { inngest } from "../client";
import { checkEscalations } from "@/lib/alerts/escalation";
import { notifySSE } from "@/lib/sse/notify";

export const alertEscalation = inngest.createFunction(
  {
    id: "alert-escalation",
    name: "Alert Escalation",
    triggers: [{ cron: "*/5 * * * *" }],
  },
  async ({ step }) => {
    const result = await step.run("check-escalations", async () => {
      return checkEscalations();
    });

    if (result.escalated > 0) {
      await notifySSE("alert.escalated", {
        escalated: result.escalated,
        alertIds: result.escalatedAlerts,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }
);

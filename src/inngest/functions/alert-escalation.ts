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
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("inngest.alert-escalation");

export const alertEscalation = inngest.createFunction(
  {
    id: "alert-escalation",
    name: "Alert Escalation",
    triggers: [{ cron: "*/5 * * * *" }],
  },
  async ({ step }) => {
    log.info("Escalation check started");

    let result;
    try {
      result = await step.run("check-escalations", async () => {
        return checkEscalations();
      });
    } catch (err) {
      log.error({ err }, "Escalation check failed");
      throw err;
    }

    log.info(
      { escalated: result.escalated, checked: result.checked },
      "Escalation check complete"
    );

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

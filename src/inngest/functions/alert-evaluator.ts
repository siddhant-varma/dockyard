/**
 * Alert evaluator worker.
 *
 * Event-driven: fires when health status changes or deploy status changes.
 * Evaluates applicable alert rules, deduplicates, groups, and dispatches
 * consolidated notifications per group.
 */

import { inngest } from "../client";
import { evaluateAlerts } from "@/lib/alerts/evaluator";
import { dispatchAlert } from "@/lib/notifications/dispatcher";
import { db } from "@/db/connection";
import { alertEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notifySSE } from "@/lib/sse/notify";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("inngest.alert-evaluator");

export const alertEvaluator = inngest.createFunction(
  {
    id: "alert-evaluator",
    name: "Alert Evaluator",
    triggers: [
      { event: "dockyard/health.status.changed" },
      { event: "dockyard/deploy.status.changed" },
    ],
  },
  async ({ event, step }) => {
    const projectId = event.data.projectId as string;
    if (!projectId) return { error: "No projectId in event" };

    log.info({ projectId, trigger: event.name }, "Alert evaluation triggered");

    let result;
    try {
      result = await step.run("evaluate-rules", async () => {
        return evaluateAlerts(projectId);
      });
    } catch (err) {
      log.error({ err, projectId }, "Alert evaluation failed");
      throw err;
    }

    log.info(
      { projectId, rulesEvaluated: result.rulesEvaluated, alertsFired: result.alertsFired, deduplicated: result.deduplicated },
      "Alert evaluation complete"
    );

    if (result.alertsFired === 0) {
      return { ...result, notified: 0 };
    }

    // Dispatch one notification per group (consolidated)
    const notified = await step.run("dispatch-notifications", async () => {
      let count = 0;

      if (result.groups.length > 0) {
        for (const group of result.groups) {
          const representativeAlert = await db.query.alertEvents.findFirst({
            where: eq(alertEvents.id, group.alerts[0].id),
          });
          if (representativeAlert) {
            await dispatchAlert({
              ...representativeAlert,
              message: group.groupMessage,
            });
            count++;
          }
        }
      } else {
        for (const alertId of result.alertIds) {
          const alert = await db.query.alertEvents.findFirst({
            where: eq(alertEvents.id, alertId),
          });
          if (alert) {
            await dispatchAlert(alert);
            count++;
          }
        }
      }

      return count;
    });

    if (result.alertsFired > 0) {
      await notifySSE("alert.fired", {
        projectId,
        alertsFired: result.alertsFired,
        deduplicated: result.deduplicated,
        groups: result.groups.length,
        timestamp: new Date().toISOString(),
      });
    }

    return { ...result, notified };
  }
);

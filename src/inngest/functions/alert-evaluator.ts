/**
 * Alert evaluator worker.
 *
 * Event-driven: fires when health status changes or deploy status changes.
 * Evaluates applicable alert rules and dispatches notifications.
 */

import { inngest } from "../client";
import { evaluateAlerts } from "@/lib/alerts/evaluator";
import { dispatchAlert } from "@/lib/notifications/dispatcher";
import { db } from "@/db/connection";
import { alertEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notifySSE } from "@/lib/sse/notify";

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

    const result = await step.run("evaluate-rules", async () => {
      return evaluateAlerts(projectId);
    });

    if (result.alertsFired === 0) {
      return { ...result, notified: 0 };
    }

    const notified = await step.run("dispatch-notifications", async () => {
      let count = 0;
      for (const alertId of result.alertIds) {
        const alert = await db.query.alertEvents.findFirst({
          where: eq(alertEvents.id, alertId),
        });
        if (alert) {
          await dispatchAlert(alert);
          count++;
        }
      }
      return count;
    });

    // Broadcast alert event to connected dashboards
    if (result.alertsFired > 0) {
      await notifySSE("alert.fired", {
        projectId,
        alertsFired: result.alertsFired,
        timestamp: new Date().toISOString(),
      });
    }

    return { ...result, notified };
  }
);

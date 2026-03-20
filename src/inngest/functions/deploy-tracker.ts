/**
 * Deploy status tracker worker.
 *
 * Event-driven: fires when a deployment is triggered.
 * Polls Dokploy for deployment status every 10 seconds (max 5 minutes).
 * Updates the deployment_events table and emits status change events.
 */

import { inngest } from "../client";
import { DokployClient } from "@/lib/dokploy/client";
import { db } from "@/db/connection";
import { deploymentEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notifySSE } from "@/lib/sse/notify";

export const deployTracker = inngest.createFunction(
  {
    id: "deploy-tracker",
    name: "Deploy Status Tracker",
    triggers: [{ event: "dockyard/deploy.triggered" }],
  },
  async ({ event, step }) => {
    const deployEventId = event.data.deployEventId as string;
    const dokployAppId = event.data.dokployAppId as string;
    const projectId = event.data.projectId as string;

    if (!deployEventId || !dokployAppId) {
      return { error: "Missing deployEventId or dokployAppId" };
    }

    const apiUrl = process.env.DOKPLOY_API_URL;
    const apiKey = process.env.DOKPLOY_API_KEY;
    if (!apiUrl || !apiKey) {
      return { error: "Dokploy API not configured" };
    }

    const client = new DokployClient(apiUrl, apiKey);
    const maxAttempts = 30; // 30 * 10s = 5 minutes

    let finalStatus = "pending";

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await step.run(`poll-status-${attempt}`, async () => {
        const app = await client.getApplication(dokployAppId);
        return app.status;
      });

      if (status === "running") {
        finalStatus = "success";
        break;
      }

      if (status === "error") {
        finalStatus = "failed";
        break;
      }

      if (status === "building") {
        finalStatus = "building";
      }

      // Wait 10 seconds before next poll
      await step.sleep("wait-for-deploy", "10s");
    }

    // Update the deployment event record
    await step.run("update-deploy-event", async () => {
      await db
        .update(deploymentEvents)
        .set({
          status: finalStatus as "success" | "failed" | "building" | "pending",
          completedAt:
            finalStatus === "success" || finalStatus === "failed"
              ? new Date()
              : undefined,
          durationSecs:
            finalStatus === "success" || finalStatus === "failed"
              ? Math.round(
                  (Date.now() - new Date(event.ts ?? Date.now()).getTime()) /
                    1000
                )
              : undefined,
        })
        .where(eq(deploymentEvents.id, deployEventId));
    });

    // Emit status change event for alert evaluation
    if (finalStatus === "failed") {
      await inngest.send({
        name: "dockyard/deploy.status.changed",
        data: { projectId, deployEventId, status: finalStatus },
      });

      // Trigger auto-rollback if enabled
      await inngest.send({
        name: "dockyard/config.auto-rollback.triggered",
        data: { projectId, deployEventId },
      });
    }

    // Broadcast deploy status to connected dashboards
    await notifySSE("deploy.status", {
      projectId,
      deployEventId,
      status: finalStatus,
      timestamp: new Date().toISOString(),
    });

    return { deployEventId, finalStatus };
  }
);

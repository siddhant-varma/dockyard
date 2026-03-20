/**
 * Auto-rollback worker.
 *
 * Event-driven: fires when a deployment fails after a config change.
 * Checks if auto-rollback is enabled for the project, and if so,
 * restores the previous configuration and notifies via SSE.
 */

import { inngest } from "../client";
import {
  getRollbackConfig,
  executeAutoRollback,
} from "@/lib/config/rollback";
import { notifySSE } from "@/lib/sse/notify";

export const autoRollback = inngest.createFunction(
  {
    id: "auto-rollback",
    name: "Config Auto-Rollback",
    triggers: [{ event: "dockyard/config.auto-rollback.triggered" }],
  },
  async ({ event, step }) => {
    const projectId = event.data.projectId as string;
    const deployEventId = event.data.deployEventId as string;

    if (!projectId || !deployEventId) {
      return { error: "Missing projectId or deployEventId" };
    }

    const config = await step.run("check-rollback-config", async () => {
      return getRollbackConfig(projectId);
    });

    if (!config.enabled) {
      return { skipped: true, reason: "Auto-rollback not enabled" };
    }

    await notifySSE("config.rollback.started", {
      projectId,
      deployEventId,
      message: "Deploy failed — auto-rolling back to previous config...",
      timestamp: new Date().toISOString(),
    });

    const result = await step.run("execute-rollback", async () => {
      return executeAutoRollback(projectId, deployEventId);
    });

    await notifySSE("config.rollback.completed", {
      projectId,
      deployEventId,
      rolledBack: result.rolledBack,
      entries: result.entries,
      timestamp: new Date().toISOString(),
    });

    return result;
  }
);

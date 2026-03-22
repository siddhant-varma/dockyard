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
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("inngest.auto-rollback");

export const autoRollback = inngest.createFunction(
  {
    id: "auto-rollback",
    name: "Config Auto-Rollback",
    triggers: [{ event: "dockyard/config.auto-rollback.triggered" }],
  },
  async ({ event, step }) => {
    const projectId = event.data.projectId as string;
    const deployEventId = event.data.deployEventId as string;

    log.info({ projectId, deployEventId }, "Auto-rollback triggered");

    if (!projectId || !deployEventId) {
      return { error: "Missing projectId or deployEventId" };
    }

    const config = await step.run("check-rollback-config", async () => {
      return getRollbackConfig(projectId);
    });

    if (!config.enabled) {
      log.warn({ projectId }, "Auto-rollback skipped — not enabled for project");
      return { skipped: true, reason: "Auto-rollback not enabled" };
    }

    await notifySSE("config.rollback.started", {
      projectId,
      deployEventId,
      message: "Deploy failed — auto-rolling back to previous config...",
      timestamp: new Date().toISOString(),
    });

    let result;
    try {
      result = await step.run("execute-rollback", async () => {
        return executeAutoRollback(projectId, deployEventId);
      });
    } catch (err) {
      log.error({ err, projectId, deployEventId }, "Auto-rollback execution failed");
      throw err;
    }

    log.info(
      { projectId, deployEventId, rolledBack: result.rolledBack, entries: result.entries },
      "Auto-rollback complete"
    );

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

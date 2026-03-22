/**
 * Smoke test runner worker.
 *
 * Event-driven: fires on test.requested (manual) or deploy.status.changed
 * (post-deploy). Also supports cron from test_configs.schedule_cron.
 */

import { inngest } from "../client";
import { notifySSE } from "@/lib/sse/notify";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("inngest.test-runner");

export const testRunner = inngest.createFunction(
  {
    id: "test-runner",
    name: "Smoke Test Runner",
    triggers: [
      { event: "dockyard/test.requested" },
      { event: "dockyard/deploy.status.changed" },
    ],
  },
  async ({ event, step }) => {
    const projectId = event.data.projectId as string;
    if (!projectId) return { error: "No projectId" };

    log.info({ projectId, trigger: event.name }, "Test run started");

    let results;
    try {
      results = await step.run("run-smoke-tests", async () => {
        const { runSmokeTests } = await import("@/lib/tests/smoke-runner");
        return runSmokeTests(projectId);
      });
    } catch (err) {
      log.error({ err, projectId }, "Test execution failed");
      throw err;
    }

    log.info(
      { projectId, passed: results.passed, failed: results.failed, totalTests: results.totalTests },
      "Test run complete"
    );

    await notifySSE("test.completed", {
      projectId,
      passed: results.passed,
      failed: results.failed,
      timestamp: new Date().toISOString(),
    });

    return results;
  }
);

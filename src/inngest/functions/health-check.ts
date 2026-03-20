/**
 * Scheduled health check poller.
 *
 * Runs every 30 seconds. Loads all active projects with configured
 * health endpoints, polls each in parallel (concurrency limit 5),
 * stores results, and triggers alert evaluation on status changes.
 */

import { inngest } from "../client";
import { resolveAllHealthUrls } from "@/lib/health/resolver";
import { pollHealth } from "@/lib/health/poller";
import {
  storeHealthResult,
  getProjectHealthSummary,
} from "@/lib/health/storage";
import { notifySSE } from "@/lib/sse/notify";

export const healthCheck = inngest.createFunction(
  {
    id: "health-check",
    name: "Health Check Poller",
    triggers: [{ cron: "*/30 * * * *" }],
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    // All work in one step to avoid Date serialization across step boundaries
    const summary = await step.run("poll-and-store", async () => {
      const urls = await resolveAllHealthUrls();
      const endpoints = [...urls.entries()].map(([projectId, ep]) => ({
        projectId,
        healthUrl: ep.healthUrl,
      }));

      if (endpoints.length === 0) {
        return { checked: 0, healthy: 0, degraded: 0, down: 0, changes: [] };
      }

      const batchSize = 5;
      let healthy = 0;
      let degraded = 0;
      let down = 0;
      const changes: Array<{ projectId: string; from: string; to: string }> =
        [];

      for (let i = 0; i < endpoints.length; i += batchSize) {
        const batch = endpoints.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map((ep) => pollHealth(ep.projectId, ep.healthUrl))
        );

        for (const result of results) {
          if (result.overallStatus === "ok") healthy++;
          else if (result.overallStatus === "degraded") degraded++;
          else down++;

          const prev = await getProjectHealthSummary(result.projectId);
          const prevStatus = prev?.overallStatus ?? "unknown";

          await storeHealthResult(result);

          const updated = await getProjectHealthSummary(result.projectId);
          if (updated && updated.overallStatus !== prevStatus) {
            changes.push({
              projectId: result.projectId,
              from: prevStatus,
              to: updated.overallStatus,
            });
          }
        }
      }

      return { checked: endpoints.length, healthy, degraded, down, changes };
    });

    // Emit events for status changes
    for (const change of summary.changes) {
      await inngest.send({
        name: "dockyard/health.status.changed",
        data: change,
      });
    }

    // Broadcast health update to connected dashboards
    await notifySSE("health.updated", {
      checked: summary.checked,
      healthy: summary.healthy,
      degraded: summary.degraded,
      down: summary.down,
      timestamp: new Date().toISOString(),
    });

    return {
      checked: summary.checked,
      healthy: summary.healthy,
      degraded: summary.degraded,
      down: summary.down,
      statusChanges: summary.changes.length,
    };
  }
);

/**
 * Hetzner metrics collection worker.
 *
 * Runs every 60 seconds. Fetches CPU, disk, and network metrics
 * from the Hetzner Cloud API and stores them in the
 * hetzner_snapshots TimescaleDB hypertable.
 */

import { inngest } from "../client";
import { HetznerClient } from "@/lib/hetzner/client";
import { storeHetznerMetrics } from "@/lib/metrics/hetzner-storage";
import { notifySSE } from "@/lib/sse/notify";

export const hetznerMetrics = inngest.createFunction(
  {
    id: "hetzner-metrics",
    name: "Hetzner Metrics Collector",
    triggers: [{ cron: "* * * * *" }],
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    const apiToken = process.env.HETZNER_API_TOKEN;
    const serverId = process.env.HETZNER_SERVER_ID;

    if (!apiToken || !serverId) {
      return {
        stored: 0,
        message: "HETZNER_API_TOKEN or HETZNER_SERVER_ID not configured",
      };
    }

    // Fetch and store in one step to avoid Date serialization issues
    const result = await step.run("fetch-and-store", async () => {
      const client = new HetznerClient(apiToken);
      const end = new Date();
      const start = new Date(end.getTime() - 2 * 60 * 1000);

      const metrics = await client.getServerMetrics(
        serverId,
        ["cpu", "disk", "network"],
        { start, end, step: 60 }
      );

      const stored = await storeHetznerMetrics(serverId, metrics);
      return { stored, seriesCount: metrics.length };
    });

    // Broadcast metrics update to connected dashboards
    await notifySSE("metrics.updated", {
      serverId,
      seriesCount: result.seriesCount,
      timestamp: new Date().toISOString(),
    });

    return result;
  }
);

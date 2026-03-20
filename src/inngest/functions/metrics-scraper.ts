/**
 * Prometheus metrics scraper worker.
 *
 * Cron: every 60 seconds. Scrapes /metrics endpoints from DIP Level 2+ projects.
 */

import { inngest } from "../client";
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { projects } from "@/db/schema";
import { notifySSE } from "@/lib/sse/notify";

export const metricsScraper = inngest.createFunction(
  {
    id: "metrics-scraper",
    name: "Prometheus Metrics Scraper",
    triggers: [{ cron: "* * * * *" }],
  },
  async ({ step }) => {
    const dipProjects = await step.run("load-dip-projects", async () => {
      return db.query.projects.findMany({
        where: eq(projects.status, "active"),
        columns: { id: true, name: true },
      });
    });

    if (dipProjects.length === 0) {
      return { projectsScraped: 0 };
    }

    const results = await step.run("scrape-metrics", async () => {
      const { scrapeMetrics } = await import("@/lib/metrics/scraper");
      const scraped = [];
      for (const project of dipProjects.slice(0, 5)) {
        try {
          const result = await scrapeMetrics(project.id);
          scraped.push({ ...result, projectId: project.id });
        } catch {
          scraped.push({ projectId: project.id, error: true, metricsStored: 0 });
        }
      }
      return scraped;
    });

    await notifySSE("metrics.scraped", {
      projectsScraped: results.length,
      timestamp: new Date().toISOString(),
    });

    return { projectsScraped: results.length };
  }
);

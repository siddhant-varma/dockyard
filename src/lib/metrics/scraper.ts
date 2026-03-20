/**
 * Prometheus metrics scraper for DockYard projects.
 *
 * Scrapes the /metrics endpoint (DIP Level 2+) from a project,
 * parses the Prometheus exposition format, and stores each data point
 * in the metric_points TimescaleDB hypertable.
 *
 * Timeout: 5 seconds per scrape to avoid blocking the polling loop.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { projects, metricPoints } from "@/db/schema";
import { parsePrometheusText, type ParsedMetric } from "./prometheus-parser";

/** Timeout for metrics scrape requests (5 seconds). */
const SCRAPE_TIMEOUT_MS = 5000;

/** Summary of a scrape operation for logging and monitoring. */
export interface ScrapeSummary {
  /** UUID of the scraped project. */
  projectId: string;
  /** Whether the scrape succeeded. */
  success: boolean;
  /** Number of metric data points stored. */
  pointsStored: number;
  /** Scrape duration in milliseconds. */
  durationMs: number;
  /** Error message if the scrape failed. */
  error?: string;
  /** Timestamp of the scrape. */
  scrapedAt: Date;
}

/**
 * Scrape the /metrics endpoint for a project and store the results.
 *
 * Resolves the metrics endpoint URL from the project's configuration,
 * fetches the Prometheus exposition text, parses it, and inserts each
 * metric as a row in the metric_points hypertable.
 *
 * @param projectId - UUID of the project to scrape
 * @returns Summary of the scrape operation
 */
export async function scrapeMetrics(projectId: string): Promise<ScrapeSummary> {
  const scrapedAt = new Date();
  const startTime = performance.now();

  try {
    const metricsUrl = await resolveMetricsEndpoint(projectId);
    if (!metricsUrl) {
      return {
        projectId,
        success: false,
        pointsStored: 0,
        durationMs: Math.round(performance.now() - startTime),
        error: "No metrics endpoint configured for project",
        scrapedAt,
      };
    }

    const response = await fetch(metricsUrl, {
      signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
      headers: { Accept: "text/plain; version=0.0.4" },
    });

    if (!response.ok) {
      return {
        projectId,
        success: false,
        pointsStored: 0,
        durationMs: Math.round(performance.now() - startTime),
        error: `HTTP ${response.status} ${response.statusText}`,
        scrapedAt,
      };
    }

    const body = await response.text();
    const parsed = parsePrometheusText(body);
    const pointsStored = await storeMetrics(projectId, parsed, scrapedAt);

    return {
      projectId,
      success: true,
      pointsStored,
      durationMs: Math.round(performance.now() - startTime),
      scrapedAt,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    return {
      projectId,
      success: false,
      pointsStored: 0,
      durationMs: Math.round(performance.now() - startTime),
      error: message.includes("abort") ? "Timeout (5s)" : message,
      scrapedAt,
    };
  }
}

/**
 * Resolve the Prometheus /metrics endpoint URL for a project.
 *
 * Checks the project record for a known base URL or local path,
 * then appends /metrics. Returns null if no endpoint can be determined.
 *
 * @param projectId - UUID of the project
 * @returns Full URL to the /metrics endpoint, or null
 */
async function resolveMetricsEndpoint(
  projectId: string
): Promise<string | null> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) return null;

  // Check for explicit metrics endpoint in .dockyard.json metadata
  if (project.localPath) {
    try {
      const { readFile } = await import("fs/promises");
      const { join } = await import("path");
      const configPath = join(project.localPath, ".dockyard.json");
      const raw = await readFile(configPath, "utf-8");
      const config = JSON.parse(raw) as Record<string, unknown>;
      if (typeof config.metricsEndpoint === "string") {
        return config.metricsEndpoint;
      }
    } catch {
      // No .dockyard.json or no metricsEndpoint field
    }
  }

  // Infer from known base domain patterns
  // In VPS mode, projects typically run behind Traefik with domain routing
  if (project.dokployAppId && project.slug) {
    // Convention: apps expose /metrics on the same domain as the app
    // The actual domain is resolved from Dokploy, but we fall back to slug-based
    return null; // Requires explicit configuration for now
  }

  // For local projects, try localhost with common ports
  if (project.localPath) {
    const techStack = project.techStack ?? [];
    const port = inferMetricsPort(techStack);
    if (port) {
      return `http://localhost:${port}/metrics`;
    }
  }

  return null;
}

/**
 * Store parsed Prometheus metrics as individual metric_point rows.
 *
 * @param projectId - UUID of the project
 * @param metrics - Parsed metrics from the Prometheus parser
 * @param recordedAt - Timestamp to use for all points in this scrape
 * @returns Number of points stored
 */
async function storeMetrics(
  projectId: string,
  metrics: ParsedMetric[],
  recordedAt: Date
): Promise<number> {
  if (metrics.length === 0) return 0;

  const values = metrics.map((m) => ({
    projectId,
    metricName: m.name,
    metricValue: m.value,
    labels: Object.keys(m.labels).length > 0 ? m.labels : null,
    recordedAt,
  }));

  // Insert in batches to avoid exceeding parameter limits
  const BATCH_SIZE = 500;
  let stored = 0;

  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    await db.insert(metricPoints).values(batch);
    stored += batch.length;
  }

  return stored;
}

/**
 * Infer the port where a project likely exposes /metrics,
 * based on common framework conventions.
 */
function inferMetricsPort(techStack: string[]): number | null {
  if (techStack.includes("next.js")) return 3000;
  if (techStack.includes("express")) return 3000;
  if (techStack.includes("fastify")) return 3000;
  if (techStack.includes("go")) return 8080;
  if (techStack.includes("rust")) return 8080;
  if (techStack.includes("python")) return 8000;
  return null;
}

/**
 * DORA metrics calculator for DockYard.
 *
 * Implements all four DORA (DevOps Research and Assessment) metrics:
 * 1. **Deployment Frequency** — How often code is deployed to production
 * 2. **Lead Time for Changes** — Time from commit to production deploy
 * 3. **Mean Time to Recovery (MTTR)** — Average time to recover from failures
 * 4. **Change Failure Rate** — Percentage of deployments that cause failures
 *
 * Each metric returns a value and a performance level (elite/high/medium/low)
 * based on the DORA team's published benchmarks.
 */

import { eq, and, gte } from "drizzle-orm";
import { db } from "@/db/connection";
import { deploymentEvents, signalEvents, incidents } from "@/db/schema";
import { resolveProjectId } from "@/lib/auth/permissions";

/** Performance level classification per DORA benchmarks. */
export type DoraPerformanceLevel = "elite" | "high" | "medium" | "low";

/** Result of the Deployment Frequency metric. */
export interface DeployFrequencyResult {
  /** Total successful deployments in the window. */
  count: number;
  /** Average deployments per day. */
  frequency: number;
  /** DORA performance classification. */
  level: DoraPerformanceLevel;
  windowDays: number;
}

/** Result of the Lead Time for Changes metric. */
export interface LeadTimeResult {
  /** Median lead time in seconds from commit to deploy. */
  medianSeconds: number | null;
  /** Number of commit-to-deploy pairs measured. */
  sampleSize: number;
  /** DORA performance classification. */
  level: DoraPerformanceLevel;
  windowDays: number;
}

/** Result of the MTTR metric. */
export interface MttrResult {
  /** Average MTTR in seconds across resolved incidents. */
  avgSeconds: number | null;
  /** Number of resolved incidents in the window. */
  incidentCount: number;
  /** DORA performance classification. */
  level: DoraPerformanceLevel;
  windowDays: number;
}

/** Result of the Change Failure Rate metric. */
export interface ChangeFailureRateResult {
  /** Number of failed deployments. */
  failedDeploys: number;
  /** Total deployments (success + failed). */
  totalDeploys: number;
  /** Failure rate as a percentage (0-100). */
  rate: number;
  /** DORA performance classification. */
  level: DoraPerformanceLevel;
  windowDays: number;
}

/** All four DORA metrics combined. */
export interface DoraMetrics {
  deployFrequency: DeployFrequencyResult;
  leadTime: LeadTimeResult;
  mttr: MttrResult;
  changeFailureRate: ChangeFailureRateResult;
}

/**
 * Calculate Deployment Frequency for a project.
 *
 * Counts successful deployments in the window and classifies performance:
 * - Elite: multiple deploys per day (frequency > 1)
 * - High: daily to weekly (frequency >= 1/7)
 * - Medium: weekly to monthly (frequency >= 1/30)
 * - Low: less than monthly
 *
 * @param projectId - The project to measure
 * @param windowDays - Number of days to look back (default: 30)
 */
export async function getDeployFrequency(
  projectId: string,
  windowDays = 30
): Promise<DeployFrequencyResult> {
  const windowStart = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  );

  const deploys = await db.query.deploymentEvents.findMany({
    where: and(
      eq(deploymentEvents.projectId, projectId),
      eq(deploymentEvents.status, "success"),
      gte(deploymentEvents.deployedAt, windowStart)
    ),
  });

  const count = deploys.length;
  const frequency = count / windowDays;

  let level: DoraPerformanceLevel;
  if (frequency > 1) {
    level = "elite";
  } else if (frequency >= 1 / 7) {
    level = "high";
  } else if (frequency >= 1 / 30) {
    level = "medium";
  } else {
    level = "low";
  }

  return { count, frequency, level, windowDays };
}

/**
 * Calculate Lead Time for Changes for a project.
 *
 * Matches commit SHAs in signal_events (source: "github", event_type: "push")
 * to deployment_events with the same commit SHA. Computes the median time
 * between the commit event and the deployment.
 *
 * Performance levels (based on median lead time):
 * - Elite: less than 1 hour
 * - High: less than 1 day
 * - Medium: less than 1 week
 * - Low: more than 1 week
 *
 * @param projectId - The project to measure
 * @param windowDays - Number of days to look back (default: 30)
 */
export async function getLeadTime(
  projectId: string,
  windowDays = 30
): Promise<LeadTimeResult> {
  const windowStart = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  );

  const deploys = await db.query.deploymentEvents.findMany({
    where: and(
      eq(deploymentEvents.projectId, projectId),
      eq(deploymentEvents.status, "success"),
      gte(deploymentEvents.deployedAt, windowStart)
    ),
  });

  const commitSignals = await db.query.signalEvents.findMany({
    where: and(
      eq(signalEvents.projectId, projectId),
      eq(signalEvents.source, "github"),
      eq(signalEvents.eventType, "push"),
      gte(signalEvents.createdAt, windowStart)
    ),
  });

  const commitTimeMap = new Map<string, Date>();
  for (const signal of commitSignals) {
    const payload = signal.rawPayload as Record<string, unknown> | null;
    const sha = payload?.commitSha as string | undefined;
    if (sha) {
      commitTimeMap.set(sha, new Date(signal.createdAt));
    }
  }

  const leadTimes: number[] = [];

  for (const deploy of deploys) {
    if (!deploy.commitSha) continue;
    const commitTime = commitTimeMap.get(deploy.commitSha);
    if (!commitTime) continue;

    const deployTime = new Date(deploy.deployedAt).getTime();
    const leadTimeSeconds = Math.round(
      (deployTime - commitTime.getTime()) / 1000
    );

    if (leadTimeSeconds > 0) {
      leadTimes.push(leadTimeSeconds);
    }
  }

  const medianSeconds = computeMedian(leadTimes);
  const level = classifyTimeMetric(medianSeconds);

  return {
    medianSeconds,
    sampleSize: leadTimes.length,
    level,
    windowDays,
  };
}

/**
 * Calculate Mean Time to Recovery (MTTR) for a project.
 *
 * Averages the mttr_seconds field across all resolved incidents
 * in the time window.
 *
 * Performance levels:
 * - Elite: less than 1 hour
 * - High: less than 1 day
 * - Medium: less than 1 week
 * - Low: more than 1 week
 *
 * @param projectId - The project to measure
 * @param windowDays - Number of days to look back (default: 30)
 */
export async function getMTTR(
  projectId: string,
  windowDays = 30
): Promise<MttrResult> {
  const windowStart = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  );

  const resolvedIncidents = await db.query.incidents.findMany({
    where: and(
      eq(incidents.projectId, projectId),
      gte(incidents.createdAt, windowStart)
    ),
  });

  const withMttr = resolvedIncidents.filter(
    (i) => i.mttrSeconds !== null && i.mttrSeconds !== undefined
  );

  let avgSeconds: number | null = null;

  if (withMttr.length > 0) {
    const sum = withMttr.reduce((acc, i) => acc + (i.mttrSeconds ?? 0), 0);
    avgSeconds = Math.round(sum / withMttr.length);
  }

  const level = classifyTimeMetric(avgSeconds);

  return {
    avgSeconds,
    incidentCount: withMttr.length,
    level,
    windowDays,
  };
}

/**
 * Calculate Change Failure Rate for a project.
 *
 * Ratio of failed deployments to total deployments (success + failed).
 *
 * Performance levels:
 * - Elite: 0-5%
 * - High: 5-10%
 * - Medium: 10-15%
 * - Low: above 15%
 *
 * @param projectId - The project to measure
 * @param windowDays - Number of days to look back (default: 30)
 */
export async function getChangeFailureRate(
  projectId: string,
  windowDays = 30
): Promise<ChangeFailureRateResult> {
  const windowStart = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  );

  const allDeploys = await db.query.deploymentEvents.findMany({
    where: and(
      eq(deploymentEvents.projectId, projectId),
      gte(deploymentEvents.deployedAt, windowStart)
    ),
  });

  const completedDeploys = allDeploys.filter(
    (d) => d.status === "success" || d.status === "failed"
  );

  const failedDeploys = completedDeploys.filter(
    (d) => d.status === "failed"
  );

  const totalDeploys = completedDeploys.length;
  const rate =
    totalDeploys > 0
      ? Math.round((failedDeploys.length / totalDeploys) * 10000) / 100
      : 0;

  let level: DoraPerformanceLevel;
  if (rate <= 5) {
    level = "elite";
  } else if (rate <= 10) {
    level = "high";
  } else if (rate <= 15) {
    level = "medium";
  } else {
    level = "low";
  }

  return {
    failedDeploys: failedDeploys.length,
    totalDeploys,
    rate,
    level,
    windowDays,
  };
}

/**
 * Get all four DORA metrics for a project by ID.
 *
 * @param projectId - The project's database ID
 * @param windowDays - Number of days to look back (default: 30)
 * @returns All four DORA metrics with performance levels
 */
export async function getAllDoraMetrics(
  projectId: string,
  windowDays = 30
): Promise<DoraMetrics> {
  const [deployFrequency, leadTime, mttr, changeFailureRate] =
    await Promise.all([
      getDeployFrequency(projectId, windowDays),
      getLeadTime(projectId, windowDays),
      getMTTR(projectId, windowDays),
      getChangeFailureRate(projectId, windowDays),
    ]);

  return { deployFrequency, leadTime, mttr, changeFailureRate };
}

/** Options for the slug-based DORA metrics API. */
export interface GetDoraMetricsOptions {
  windowDays?: number;
}

/**
 * Get all four DORA metrics for a project by slug.
 *
 * Convenience wrapper that resolves the project slug to an ID before
 * computing metrics. Designed for use in API route handlers.
 *
 * @param projectSlug - The project's URL slug
 * @param options - Options including windowDays (default: 30)
 * @returns All four DORA metrics with performance levels
 * @throws ApiError NOT_FOUND if the project slug does not exist
 */
export async function getDoraMetrics(
  projectSlug: string,
  options: GetDoraMetricsOptions = {}
): Promise<DoraMetrics> {
  const projectId = await resolveProjectId(projectSlug);
  return getAllDoraMetrics(projectId, options.windowDays ?? 30);
}

/**
 * Compute the median of a numeric array. Returns null for empty arrays.
 */
function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

/**
 * Classify a time-based metric (lead time or MTTR) into a DORA performance level.
 * Thresholds: elite < 1h, high < 1d, medium < 1w, low >= 1w.
 */
function classifyTimeMetric(seconds: number | null): DoraPerformanceLevel {
  if (seconds === null) return "low";
  if (seconds < 3600) return "elite";
  if (seconds < 86400) return "high";
  if (seconds < 604800) return "medium";
  return "low";
}

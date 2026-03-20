/**
 * Incident metrics aggregation for DockYard.
 *
 * Computes aggregate statistics over a project's incident history:
 * total count, breakdown by severity, average MTTR, longest incident,
 * and week-over-week trend comparison. Used by dashboards and DORA metrics.
 */

import { eq, and, gte } from "drizzle-orm";
import { db } from "@/db/connection";
import { incidents } from "@/db/schema";


/** Aggregated incident metrics for a project within a time window. */
export interface IncidentMetrics {
  /** Total number of incidents in the window. */
  total: number;
  /** Breakdown by severity level. */
  bySeverity: {
    sev1: number;
    sev2: number;
    sev3: number;
    sev4: number;
  };
  /** Average Mean Time To Resolution in seconds (resolved incidents only). */
  avgMttrSeconds: number | null;
  /** Longest incident duration in seconds (resolved incidents only). */
  longestIncidentSeconds: number | null;
  /** Week-over-week comparison. */
  trend: {
    /** Incident count in the most recent 7 days of the window. */
    currentWeek: number;
    /** Incident count in the 7 days before that. */
    previousWeek: number;
    /** Percentage change: positive means more incidents, negative means fewer. */
    changePercent: number | null;
  };
}

/**
 * Compute aggregate incident metrics for a project.
 *
 * @param projectId - The project to compute metrics for
 * @param windowDays - Number of days to look back (default: 30)
 * @returns Aggregated incident metrics
 */
export async function getIncidentMetrics(
  projectId: string,
  windowDays = 30
): Promise<IncidentMetrics> {
  const windowStart = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  );

  const allIncidents = await db.query.incidents.findMany({
    where: and(
      eq(incidents.projectId, projectId),
      gte(incidents.createdAt, windowStart)
    ),
  });

  const total = allIncidents.length;

  const bySeverity = {
    sev1: 0,
    sev2: 0,
    sev3: 0,
    sev4: 0,
  };

  for (const incident of allIncidents) {
    const sev = incident.severity as keyof typeof bySeverity;
    if (sev in bySeverity) {
      bySeverity[sev]++;
    }
  }

  const resolvedIncidents = allIncidents.filter(
    (i) => i.mttrSeconds !== null && i.mttrSeconds !== undefined
  );

  let avgMttrSeconds: number | null = null;
  let longestIncidentSeconds: number | null = null;

  if (resolvedIncidents.length > 0) {
    const mttrValues = resolvedIncidents.map((i) => i.mttrSeconds ?? 0);
    const sum = mttrValues.reduce((acc, val) => acc + val, 0);
    avgMttrSeconds = Math.round(sum / mttrValues.length);
    longestIncidentSeconds = Math.max(...mttrValues);
  }

  const trend = computeWeekOverWeekTrend(allIncidents);

  return {
    total,
    bySeverity,
    avgMttrSeconds,
    longestIncidentSeconds,
    trend,
  };
}

/**
 * Compute week-over-week incident trend.
 *
 * Compares the count of incidents created in the most recent 7 days
 * against the 7 days before that.
 */
function computeWeekOverWeekTrend(
  allIncidents: Array<{ createdAt: Date }>
): IncidentMetrics["trend"] {
  const now = Date.now();
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

  const currentWeekStart = new Date(now - oneWeekMs);
  const previousWeekStart = new Date(now - 2 * oneWeekMs);

  let currentWeek = 0;
  let previousWeek = 0;

  for (const incident of allIncidents) {
    const created = new Date(incident.createdAt).getTime();
    if (created >= currentWeekStart.getTime()) {
      currentWeek++;
    } else if (created >= previousWeekStart.getTime()) {
      previousWeek++;
    }
  }

  let changePercent: number | null = null;
  if (previousWeek > 0) {
    changePercent = Math.round(
      ((currentWeek - previousWeek) / previousWeek) * 100
    );
  } else if (currentWeek > 0) {
    changePercent = 100;
  }

  return { currentWeek, previousWeek, changePercent };
}

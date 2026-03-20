/**
 * Velocity calculator for DockYard projects.
 *
 * Computes development velocity metrics from GitHub signal events and
 * roadmap item completion rates. Used by the confidence scoring engine
 * and AI weekly summaries.
 *
 * @example
 * ```ts
 * const metrics = await calculateVelocity(projectId, 30);
 * // { commitsPerWeek: 12.5, itemsCompletedPerWeek: 2.3, trend: "accelerating" }
 * ```
 */

import { eq, and, gte } from "drizzle-orm";
import { db } from "@/db/connection";
import { signalEvents, roadmapItems } from "@/db/schema";

/** Trend direction of project velocity. */
export type VelocityTrend = "accelerating" | "decelerating" | "stable";

/** Velocity metrics for a project over a given window. */
export interface VelocityMetrics {
  projectId: string;
  windowDays: number;
  commitsPerWeek: number;
  itemsCompletedPerWeek: number;
  avgItemCompletionDays: number | null;
  trend: VelocityTrend;
  calculatedAt: Date;
}

/**
 * Calculate development velocity for a project.
 *
 * @param projectId - The project's database ID
 * @param windowDays - Number of days to analyze (default: 30)
 * @returns Velocity metrics including commits/week, items/week, and trend
 */
export async function calculateVelocity(
  projectId: string,
  windowDays = 30
): Promise<VelocityMetrics> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const weeks = Math.max(1, windowDays / 7);

  const commits = await db.query.signalEvents.findMany({
    where: and(
      eq(signalEvents.projectId, projectId),
      eq(signalEvents.source, "github"),
      eq(signalEvents.eventType, "push"),
      gte(signalEvents.createdAt, since)
    ),
  });

  const completedItems = await db.query.roadmapItems.findMany({
    where: and(
      eq(roadmapItems.projectId, projectId),
      eq(roadmapItems.status, "completed"),
      gte(roadmapItems.completedAt, since)
    ),
  });

  const commitsPerWeek = Number((commits.length / weeks).toFixed(1));
  const itemsCompletedPerWeek = Number(
    (completedItems.length / weeks).toFixed(1)
  );

  let totalCompletionDays = 0;
  let itemsWithDuration = 0;
  for (const item of completedItems) {
    if (item.completedAt && item.estimatedAt) {
      const days =
        (new Date(item.completedAt).getTime() -
          new Date(item.estimatedAt).getTime()) /
        (24 * 60 * 60 * 1000);
      totalCompletionDays += Math.abs(days);
      itemsWithDuration++;
    }
  }
  const avgItemCompletionDays =
    itemsWithDuration > 0
      ? Number((totalCompletionDays / itemsWithDuration).toFixed(1))
      : null;

  const trend = calculateTrend(projectId, since, weeks);

  return {
    projectId,
    windowDays,
    commitsPerWeek,
    itemsCompletedPerWeek,
    avgItemCompletionDays,
    trend: await trend,
    calculatedAt: new Date(),
  };
}

/**
 * Determine velocity trend by comparing first-half vs second-half activity.
 */
async function calculateTrend(
  projectId: string,
  since: Date,
  totalWeeks: number
): Promise<VelocityTrend> {
  const midpoint = new Date(
    since.getTime() + (Date.now() - since.getTime()) / 2
  );

  const firstHalf = await db.query.signalEvents.findMany({
    where: and(
      eq(signalEvents.projectId, projectId),
      eq(signalEvents.source, "github"),
      gte(signalEvents.createdAt, since)
    ),
  });

  const firstHalfCount = firstHalf.filter(
    (e) => new Date(e.createdAt) < midpoint
  ).length;
  const secondHalfCount = firstHalf.filter(
    (e) => new Date(e.createdAt) >= midpoint
  ).length;

  const halfWeeks = Math.max(1, totalWeeks / 2);
  const firstRate = firstHalfCount / halfWeeks;
  const secondRate = secondHalfCount / halfWeeks;

  if (firstRate === 0 && secondRate === 0) return "stable";

  const changeRatio =
    firstRate > 0 ? (secondRate - firstRate) / firstRate : secondRate > 0 ? 1 : 0;

  if (changeRatio > 0.2) return "accelerating";
  if (changeRatio < -0.2) return "decelerating";
  return "stable";
}

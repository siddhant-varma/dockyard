/**
 * Confidence scoring engine for DockYard projects.
 *
 * Computes a 0.00–1.00 confidence score reflecting how likely a project
 * is to meet its roadmap timeline. Factors:
 *
 * 1. **Velocity vs remaining** — high velocity + few items left = high confidence
 * 2. **Blocker count** — each active blocker penalizes 0.05–0.15
 * 3. **Checkpoint recency** — score decays 0.02/day after 14 days without a
 *    manual checkpoint, capped at -0.30
 * 4. **Health status** — degraded: -0.10, down: -0.20
 *
 * Manual checkpoints always override the automated score.
 */

import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db/connection";
import {
  roadmapItems,
  checkpoints,
  projectHealth,
} from "@/db/schema";
import { calculateVelocity } from "./velocity";

/** Breakdown of factors contributing to the confidence score. */
export interface ConfidenceBreakdown {
  velocityFactor: number;
  blockerPenalty: number;
  recencyPenalty: number;
  healthPenalty: number;
  manualOverride: boolean;
}

/** Result of a confidence calculation. */
export interface ConfidenceResult {
  projectId: string;
  score: number;
  breakdown: ConfidenceBreakdown;
  decayWarning: boolean;
  calculatedAt: Date;
}

/**
 * Calculate the confidence score for a project.
 *
 * @param projectId - The project's database ID
 * @returns Confidence result with score, breakdown, and decay warning
 */
export async function calculateConfidence(
  projectId: string
): Promise<ConfidenceResult> {
  const velocity = await calculateVelocity(projectId, 30);

  const allItems = await db.query.roadmapItems.findMany({
    where: eq(roadmapItems.projectId, projectId),
  });

  const remaining = allItems.filter((i) => i.status !== "completed");
  const _completed = allItems.filter((i) => i.status === "completed");

  const velocityFactor = calculateVelocityFactor(
    velocity.itemsCompletedPerWeek,
    remaining.length
  );

  const blockerPenalty = calculateBlockerPenalty(allItems);

  const latestCheckpoint = await db.query.checkpoints.findFirst({
    where: and(
      eq(checkpoints.projectId, projectId),
      eq(checkpoints.type, "manual")
    ),
    orderBy: desc(checkpoints.createdAt),
  });

  const { penalty: recencyPenalty, decayWarning } =
    calculateRecencyPenalty(latestCheckpoint);

  const health = await db.query.projectHealth.findFirst({
    where: eq(projectHealth.projectId, projectId),
  });
  const healthPenalty = calculateHealthPenalty(health?.overallStatus ?? "unknown");

  if (latestCheckpoint?.confidence) {
    const manualScore = Number(latestCheckpoint.confidence);
    const daysSinceManual = latestCheckpoint.createdAt
      ? (Date.now() - new Date(latestCheckpoint.createdAt).getTime()) /
        (24 * 60 * 60 * 1000)
      : Infinity;

    if (daysSinceManual <= 7) {
      return {
        projectId,
        score: clampScore(manualScore),
        breakdown: {
          velocityFactor,
          blockerPenalty,
          recencyPenalty: 0,
          healthPenalty,
          manualOverride: true,
        },
        decayWarning: false,
        calculatedAt: new Date(),
      };
    }
  }

  const rawScore =
    velocityFactor - blockerPenalty - recencyPenalty - healthPenalty;

  return {
    projectId,
    score: clampScore(rawScore),
    breakdown: {
      velocityFactor,
      blockerPenalty,
      recencyPenalty,
      healthPenalty,
      manualOverride: false,
    },
    decayWarning,
    calculatedAt: new Date(),
  };
}

function calculateVelocityFactor(
  itemsPerWeek: number,
  remaining: number
): number {
  if (remaining === 0) return 0.9;
  if (itemsPerWeek === 0) return 0.2;

  const weeksToComplete = remaining / itemsPerWeek;

  if (weeksToComplete <= 2) return 0.9;
  if (weeksToComplete <= 4) return 0.75;
  if (weeksToComplete <= 8) return 0.6;
  if (weeksToComplete <= 12) return 0.45;
  return 0.3;
}

function calculateBlockerPenalty(
  items: Array<{ blockers: unknown }>
): number {
  let penalty = 0;
  for (const item of items) {
    if (!item.blockers || !Array.isArray(item.blockers)) continue;
    for (const blocker of item.blockers) {
      const b = blocker as { resolved_at?: string; severity?: string };
      if (b.resolved_at) continue;

      switch (b.severity) {
        case "critical":
          penalty += 0.15;
          break;
        case "high":
          penalty += 0.1;
          break;
        case "medium":
          penalty += 0.07;
          break;
        default:
          penalty += 0.05;
      }
    }
  }
  return Math.min(penalty, 0.5);
}

function calculateRecencyPenalty(
  checkpoint: { createdAt: Date } | undefined | null
): { penalty: number; decayWarning: boolean } {
  if (!checkpoint?.createdAt) {
    return { penalty: 0.15, decayWarning: true };
  }

  const daysSince =
    (Date.now() - new Date(checkpoint.createdAt).getTime()) /
    (24 * 60 * 60 * 1000);

  if (daysSince <= 14) return { penalty: 0, decayWarning: false };

  const decayDays = daysSince - 14;
  const penalty = Math.min(decayDays * 0.02, 0.3);

  return { penalty: Number(penalty.toFixed(2)), decayWarning: true };
}

function calculateHealthPenalty(status: string): number {
  if (status === "down") return 0.2;
  if (status === "degraded") return 0.1;
  return 0;
}

function clampScore(score: number): number {
  return Number(Math.max(0, Math.min(1, score)).toFixed(2));
}

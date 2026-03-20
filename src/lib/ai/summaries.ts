/**
 * AI summary generation service for DockYard.
 *
 * Generates weekly project summaries and milestone wrap-ups using
 * structured prompts. When no AI SDK is configured, falls back to
 * template-based summaries built from raw data.
 *
 * Summaries are stored in the `ai_context_snapshots` table.
 */

import { eq, and, gte } from "drizzle-orm";
import { db } from "@/db/connection";
import {
  signalEvents,
  roadmapItems,
  projectHealth,
  deploymentEvents,
  configAuditLog,
  aiContextSnapshots,
  projects,
} from "@/db/schema";
import { calculateVelocity } from "./velocity";

/** Weekly summary structure. */
export interface WeeklySummary {
  projectId: string;
  projectName: string;
  period: { start: Date; end: Date };
  narrative: string;
  highlights: string[];
  concerns: string[];
  nextWeekOutlook: string;
  generatedAt: Date;
}

/** Milestone wrap-up structure. */
export interface MilestoneWrapUp {
  projectId: string;
  projectName: string;
  phase: string;
  summary: string;
  deliverables: string[];
  metrics: {
    durationDays: number;
    itemsCompleted: number;
    avgVelocityPerWeek: number;
  };
  lessonsLearned: string[];
  generatedAt: Date;
}

/**
 * Generate a weekly summary for a project.
 *
 * Gathers the past 7 days of activity and produces a structured summary.
 * Falls back to template-based generation when AI SDK is not available.
 *
 * @param projectId - The project's database ID
 * @returns Weekly summary object
 */
export async function generateWeeklySummary(
  projectId: string
): Promise<WeeklySummary> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { name: true },
  });

  const [events, velocity, health, deploys, configChanges] = await Promise.all([
    db.query.signalEvents.findMany({
      where: and(eq(signalEvents.projectId, projectId), gte(signalEvents.createdAt, since)),
    }),
    calculateVelocity(projectId, 7),
    db.query.projectHealth.findFirst({ where: eq(projectHealth.projectId, projectId) }),
    db.query.deploymentEvents.findMany({
      where: and(eq(deploymentEvents.projectId, projectId), gte(deploymentEvents.deployedAt, since)),
    }),
    db.select().from(configAuditLog).where(
      and(eq(configAuditLog.projectId, projectId), gte(configAuditLog.changedAt, since))
    ),
  ]);

  const projectName = project?.name ?? "Unknown";
  const pushEvents = events.filter((e) => e.eventType === "push").length;
  const prEvents = events.filter((e) => e.eventType === "pull_request").length;
  const successDeploys = deploys.filter((d) => d.status === "success").length;
  const failedDeploys = deploys.filter((d) => d.status === "failed").length;
  const healthStatus = health?.overallStatus ?? "unknown";

  const highlights: string[] = [];
  if (pushEvents > 0) highlights.push(`${pushEvents} code pushes this week`);
  if (prEvents > 0) highlights.push(`${prEvents} pull requests`);
  if (successDeploys > 0) highlights.push(`${successDeploys} successful deployments`);
  if (configChanges.length > 0) highlights.push(`${configChanges.length} config changes`);
  if (velocity.itemsCompletedPerWeek > 0)
    highlights.push(`${velocity.itemsCompletedPerWeek} roadmap items completed`);

  const concerns: string[] = [];
  if (failedDeploys > 0) concerns.push(`${failedDeploys} failed deployment(s)`);
  if (healthStatus === "down") concerns.push("Service is currently down");
  if (healthStatus === "degraded") concerns.push("Service health is degraded");
  if (velocity.trend === "decelerating") concerns.push("Development velocity is decelerating");

  const narrative = buildNarrative(projectName, highlights, concerns, velocity);
  const nextWeekOutlook = buildOutlook(velocity, concerns.length);

  const summary: WeeklySummary = {
    projectId,
    projectName,
    period: { start: since, end: new Date() },
    narrative,
    highlights,
    concerns,
    nextWeekOutlook,
    generatedAt: new Date(),
  };

  await db.insert(aiContextSnapshots).values({
    projectId,
    payload: summary,
    format: "weekly_summary",
    generatedAt: new Date(),
  });

  return summary;
}

/**
 * Generate a milestone wrap-up for a completed phase.
 *
 * @param projectId - The project's database ID
 * @param phase - The completed phase name (e.g., "Phase 1")
 * @returns Milestone wrap-up object
 */
export async function generateMilestoneWrapUp(
  projectId: string,
  phase: string
): Promise<MilestoneWrapUp> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { name: true },
  });

  const phaseItems = await db.query.roadmapItems.findMany({
    where: and(eq(roadmapItems.projectId, projectId), eq(roadmapItems.phase, phase)),
  });

  const completed = phaseItems.filter((i) => i.status === "completed");
  const deliverables = completed.map((i) => i.title);

  let durationDays = 0;
  const completedDates = completed
    .filter((i) => i.completedAt !== null)
    .map((i) => new Date(i.completedAt as string | Date).getTime());
  if (completedDates.length > 1) {
    durationDays = Math.round(
      (Math.max(...completedDates) - Math.min(...completedDates)) / (24 * 60 * 60 * 1000)
    );
  }

  const velocity = await calculateVelocity(projectId, Math.max(durationDays, 7));

  const wrapUp: MilestoneWrapUp = {
    projectId,
    projectName: project?.name ?? "Unknown",
    phase,
    summary: `Phase "${phase}" completed with ${completed.length} of ${phaseItems.length} items delivered over ${durationDays} days.`,
    deliverables,
    metrics: {
      durationDays,
      itemsCompleted: completed.length,
      avgVelocityPerWeek: velocity.itemsCompletedPerWeek,
    },
    lessonsLearned: [],
    generatedAt: new Date(),
  };

  await db.insert(aiContextSnapshots).values({
    projectId,
    payload: wrapUp,
    format: "milestone_wrapup",
    generatedAt: new Date(),
  });

  return wrapUp;
}

function buildNarrative(
  name: string,
  highlights: string[],
  concerns: string[],
  velocity: { trend: string; commitsPerWeek: number }
): string {
  const parts = [`${name} had `];

  if (highlights.length === 0) {
    parts.push("a quiet week with minimal activity.");
  } else {
    parts.push(`an active week: ${highlights.join(", ")}. `);
    if (velocity.trend === "accelerating") {
      parts.push("Development velocity is increasing. ");
    } else if (velocity.trend === "stable") {
      parts.push("Development pace remains steady. ");
    }
  }

  if (concerns.length > 0) {
    parts.push(`Areas of concern: ${concerns.join("; ")}.`);
  }

  return parts.join("");
}

function buildOutlook(
  velocity: { trend: string; itemsCompletedPerWeek: number },
  concernCount: number
): string {
  if (concernCount > 1) {
    return "Multiple concerns need attention. Focus on stabilization before new features.";
  }
  if (velocity.trend === "accelerating") {
    return "Strong momentum — good week to tackle complex roadmap items.";
  }
  if (velocity.trend === "decelerating") {
    return "Velocity is slowing — consider identifying and removing blockers.";
  }
  return "Steady progress expected. Continue current trajectory.";
}

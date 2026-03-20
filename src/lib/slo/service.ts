/**
 * SLO (Service Level Objective) definition CRUD service.
 *
 * Manages SLO definitions per project. Each SLO tracks a specific metric
 * (availability, latency_p99, error_rate) against a target value over a
 * configurable time window.
 *
 * SLO budget calculations are performed by the companion calculator service.
 *
 * @see calculator.ts for budget computation
 */

import { eq, and } from "drizzle-orm";
import { db } from "@/db/connection";
import { sloBudgets } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";

/** Supported SLO metric types. */
export type SloMetric = "availability" | "latency_p99" | "error_rate";

/** Data required to create an SLO definition. */
export interface CreateSloInput {
  metricName: SloMetric;
  targetValue: number;
  windowDays?: number;
}

/** Data allowed when updating an SLO definition. */
export interface UpdateSloInput {
  targetValue?: number;
  windowDays?: number;
}

const SUPPORTED_METRICS: SloMetric[] = [
  "availability",
  "latency_p99",
  "error_rate",
];

/**
 * Create a new SLO definition for a project.
 *
 * @param projectId - The project's database ID
 * @param input - SLO metric name, target value, and optional window (default 30 days)
 * @returns The newly created SLO record
 * @throws ApiError if the metric name is unsupported or a duplicate SLO exists
 */
export async function createSLO(projectId: string, input: CreateSloInput) {
  if (!SUPPORTED_METRICS.includes(input.metricName)) {
    throw new ApiError(
      "BAD_REQUEST",
      `Unsupported metric: ${input.metricName}. Supported: ${SUPPORTED_METRICS.join(", ")}`
    );
  }

  const existing = await db.query.sloBudgets.findFirst({
    where: and(
      eq(sloBudgets.projectId, projectId),
      eq(sloBudgets.metricName, input.metricName)
    ),
  });

  if (existing) {
    throw new ApiError(
      "CONFLICT",
      `SLO for metric "${input.metricName}" already exists on this project`
    );
  }

  const [slo] = await db
    .insert(sloBudgets)
    .values({
      projectId,
      metricName: input.metricName,
      targetValue: input.targetValue,
      windowDays: input.windowDays ?? 30,
    })
    .returning();

  return slo;
}

/**
 * List all SLO definitions for a project with current budget data.
 *
 * @param projectId - The project's database ID
 * @returns Array of SLO records with budget calculations
 */
export async function listSLOs(projectId: string) {
  return db.query.sloBudgets.findMany({
    where: eq(sloBudgets.projectId, projectId),
  });
}

/**
 * Update an existing SLO definition.
 *
 * @param id - The SLO record's database ID
 * @param input - Fields to update (targetValue and/or windowDays)
 * @returns The updated SLO record, or null if not found
 */
export async function updateSLO(id: string, input: UpdateSloInput) {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (input.targetValue !== undefined) updates.targetValue = input.targetValue;
  if (input.windowDays !== undefined) updates.windowDays = input.windowDays;

  const [updated] = await db
    .update(sloBudgets)
    .set(updates)
    .where(eq(sloBudgets.id, id))
    .returning();

  return updated ?? null;
}

/**
 * Delete an SLO definition.
 *
 * @param id - The SLO record's database ID
 * @returns True if deleted, false if not found
 */
export async function deleteSLO(id: string): Promise<boolean> {
  const [deleted] = await db
    .delete(sloBudgets)
    .where(eq(sloBudgets.id, id))
    .returning({ id: sloBudgets.id });

  return !!deleted;
}

/**
 * Smoke test configuration CRUD service for DockYard.
 *
 * Manages smoke test configurations stored in the test_configs table.
 * Each configuration defines a set of endpoints to test, with optional
 * scheduling (cron) and post-deploy trigger settings.
 */

import { eq, desc } from "drizzle-orm";
import { db } from "@/db/connection";
import { testConfigs } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";

/** Input for creating a new test configuration. */
export interface CreateTestConfigInput {
  projectId: string;
  name: string;
  type?: string;
  config?: Record<string, unknown> | unknown;
  scheduleCron?: string;
  runPostDeploy?: boolean;
  enabled?: boolean;
  [key: string]: unknown;
}

/** Input for updating an existing test configuration. */
export interface UpdateTestConfigInput {
  name?: string;
  config?: Record<string, unknown>;
  scheduleCron?: string | null;
  runPostDeploy?: boolean;
  enabled?: boolean;
}

/**
 * Create a new test configuration.
 *
 * @param input - The test configuration to create (must include projectId)
 * @returns The created test config record
 */
export async function createTestConfig(input: CreateTestConfigInput) {
  const [config] = await db
    .insert(testConfigs)
    .values({
      projectId: input.projectId,
      name: input.name,
      type: (input.type as "smoke" | "integration" | "load" | "health_check" | "custom") ?? "smoke",
      config: (input.config as Record<string, unknown>) ?? {},
      scheduleCron: input.scheduleCron,
      runPostDeploy: input.runPostDeploy ?? false,
      enabled: input.enabled ?? true,
    })
    .returning();

  return config;
}

/**
 * List all test configurations for a project.
 *
 * @param projectId - The project's database ID
 * @returns Array of test config records ordered by creation date (newest first)
 */
export async function listTestConfigs(projectId: string) {
  return db.query.testConfigs.findMany({
    where: eq(testConfigs.projectId, projectId),
    orderBy: desc(testConfigs.createdAt),
  });
}

/**
 * Update an existing test configuration.
 *
 * @param configId - The ID of the test config to update
 * @param input - Fields to update
 * @returns The updated test config record
 * @throws ApiError NOT_FOUND if the config does not exist
 */
export async function updateTestConfig(
  configId: string,
  input: UpdateTestConfigInput
) {
  const existing = await db.query.testConfigs.findFirst({
    where: eq(testConfigs.id, configId),
  });

  if (!existing) {
    throw new ApiError("NOT_FOUND", "Test configuration not found");
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updates.name = input.name;
  if (input.config !== undefined) updates.config = input.config;
  if (input.scheduleCron !== undefined) updates.scheduleCron = input.scheduleCron;
  if (input.runPostDeploy !== undefined) updates.runPostDeploy = input.runPostDeploy;
  if (input.enabled !== undefined) updates.enabled = input.enabled;

  const [updated] = await db
    .update(testConfigs)
    .set(updates)
    .where(eq(testConfigs.id, configId))
    .returning();

  return updated;
}

/**
 * Delete a test configuration.
 *
 * @param configId - The ID of the test config to delete
 * @throws ApiError NOT_FOUND if the config does not exist
 */
export async function deleteTestConfig(configId: string): Promise<void> {
  const existing = await db.query.testConfigs.findFirst({
    where: eq(testConfigs.id, configId),
  });

  if (!existing) {
    throw new ApiError("NOT_FOUND", "Test configuration not found");
  }

  await db.delete(testConfigs).where(eq(testConfigs.id, configId));
}

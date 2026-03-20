/**
 * Quick action service for common deployment operations.
 *
 * Provides one-click operations for the DockYard dashboard: quick redeploy
 * and single environment variable updates. These wrap the DeployProvider
 * (Dokploy client) with project-level lookups and audit logging.
 *
 * Quick actions are only available when:
 * - DockYard is running in server/VPS mode
 * - The project has a Dokploy app ID configured
 * - The user has appropriate permissions (project_admin or superadmin)
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { projects, deploymentEvents, auditLogs } from "@/db/schema";
import { DokployClient } from "@/lib/dokploy/client";
import { env, isServerMode } from "@/lib/env";

/** Result of a quick redeploy action. */
export interface RedeployResult {
  /** Whether the redeploy was triggered successfully. */
  success: boolean;
  /** Deployment ID from the deploy provider. */
  deployId?: string;
  /** Error message if the action failed. */
  error?: string;
}

/** Result of a quick environment variable update. */
export interface EnvUpdateResult {
  /** Whether the update was applied successfully. */
  success: boolean;
  /** Whether a redeploy was triggered after the update. */
  redeployTriggered: boolean;
  /** Error message if the action failed. */
  error?: string;
}

/**
 * Trigger a redeploy for a project via the Dokploy deploy platform.
 *
 * Looks up the project's Dokploy app ID, triggers a redeploy through
 * the Dokploy API, and records the deployment event in the database.
 *
 * @param projectId - UUID of the project to redeploy
 * @param triggeredBy - User ID or identifier of who triggered the action
 * @returns Result indicating success or failure
 */
export async function quickRedeploy(
  projectId: string,
  triggeredBy?: string
): Promise<RedeployResult> {
  if (!isServerMode) {
    return {
      success: false,
      error: "Quick redeploy is only available in server/VPS mode",
    };
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    return { success: false, error: "Project not found" };
  }

  if (!project.dokployAppId) {
    return {
      success: false,
      error: "Project has no Dokploy app ID configured",
    };
  }

  const client = createDokployClient();
  if (!client) {
    return {
      success: false,
      error: "Dokploy API credentials not configured",
    };
  }

  try {
    const result = await client.redeploy(project.dokployAppId);

    // Record the deployment event
    await db.insert(deploymentEvents).values({
      projectId,
      status: "deploying",
      triggeredBy: triggeredBy ?? "quick_action",
      dokployDeployId: result.deployId,
    });

    // Audit log
    await db.insert(auditLogs).values({
      actorId: triggeredBy,
      action: "quick_redeploy",
      targetType: "project",
      targetId: projectId,
      diff: {
        dokployAppId: project.dokployAppId,
        deployId: result.deployId,
      },
    });

    return {
      success: true,
      deployId: result.deployId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Update a single environment variable for a project and trigger a redeploy.
 *
 * Fetches the current environment string from Dokploy, updates or adds the
 * specified key-value pair, saves the updated environment, and triggers
 * a redeploy. This is the safe path for single-variable updates — it
 * preserves all existing variables.
 *
 * IMPORTANT: Dokploy requires sending the FULL environment string. This
 * function handles the read-modify-write cycle to avoid data loss.
 *
 * @param projectId - UUID of the project
 * @param key - Environment variable key to set
 * @param value - New value for the environment variable
 * @param triggeredBy - User ID or identifier of who triggered the action
 * @returns Result indicating success and whether a redeploy was triggered
 */
export async function quickEnvUpdate(
  projectId: string,
  key: string,
  value: string,
  triggeredBy?: string
): Promise<EnvUpdateResult> {
  if (!isServerMode) {
    return {
      success: false,
      redeployTriggered: false,
      error: "Quick env update is only available in server/VPS mode",
    };
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    return { success: false, redeployTriggered: false, error: "Project not found" };
  }

  if (!project.dokployAppId) {
    return {
      success: false,
      redeployTriggered: false,
      error: "Project has no Dokploy app ID configured",
    };
  }

  const client = createDokployClient();
  if (!client) {
    return {
      success: false,
      redeployTriggered: false,
      error: "Dokploy API credentials not configured",
    };
  }

  try {
    // Read current environment
    const currentEnv = await client.getEnvironment(project.dokployAppId);

    // Update the specific key
    const updatedEnv = updateEnvString(currentEnv, key, value);

    // Save the full environment string (Dokploy requirement)
    await client.saveEnvironment(project.dokployAppId, updatedEnv);

    // Trigger redeploy (separate API call — Dokploy doesn't auto-redeploy)
    await client.redeploy(project.dokployAppId);

    // Audit log (record the key but NOT the value for security)
    await db.insert(auditLogs).values({
      actorId: triggeredBy,
      action: "quick_env_update",
      targetType: "config_entry",
      targetId: projectId,
      diff: {
        key,
        dokployAppId: project.dokployAppId,
        redeployed: true,
      },
    });

    return { success: true, redeployTriggered: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, redeployTriggered: false, error: message };
  }
}

/**
 * Update or add a key-value pair in a Dokploy environment string.
 *
 * Dokploy stores environment variables as a newline-separated string
 * in KEY=VALUE format. This function parses the string, updates or
 * adds the specified key, and returns the modified string.
 *
 * @param envString - Current environment variable string
 * @param key - Key to update or add
 * @param value - New value
 * @returns Updated environment string
 */
function updateEnvString(envString: string, key: string, value: string): string {
  const lines = envString.split("\n");
  let found = false;

  const updated = lines.map((line) => {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (trimmed === "" || trimmed.startsWith("#")) return line;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) return line;

    const lineKey = trimmed.substring(0, eqIndex);
    if (lineKey === key) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!found) {
    updated.push(`${key}=${value}`);
  }

  return updated.join("\n");
}

/**
 * Create a DokployClient from environment variables.
 * Returns null if credentials are not configured.
 */
function createDokployClient(): DokployClient | null {
  const apiUrl = env.DOKPLOY_API_URL;
  const apiKey = env.DOKPLOY_API_KEY;

  if (!apiUrl || !apiKey) return null;
  return new DokployClient(apiUrl, apiKey);
}

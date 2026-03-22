/**
 * Deployment rollback service for DockYard.
 *
 * Creates a new deployment event marked as "rolled_back" that references
 * a target (previous) deployment, and logs an audit entry for traceability.
 * The actual rollback mechanism depends on the deploy provider (e.g., Dokploy)
 * — this service handles the DockYard-side bookkeeping.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { deploymentEvents, auditLogs } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { resolveProjectId } from "@/lib/auth/permissions";
import { createModuleLogger } from "@/lib/logger";
const log = createModuleLogger("deployments.rollback");

/** Result of a rollback operation. */
export interface RollbackResult {
  /** The newly created rollback deployment event ID. */
  id: string;
  /** The newly created deployment event for the rollback. */
  rollbackEventId: string;
  /** The target deployment that was rolled back to. */
  targetDeployEventId: string;
  /** The project that was rolled back. */
  projectId: string;
  /** Version/commit that was rolled back to. */
  targetVersion: string | null;
  targetCommitSha: string | null;
}

/** Options for triggering a rollback. */
export interface TriggerRollbackOptions {
  triggeredBy?: string;
}

/**
 * Trigger a rollback to a specific deployment.
 *
 * Resolves the project slug to an ID, then creates a new deployment_event
 * with status "rolled_back" referencing the target deployment. Also records
 * an audit log entry for traceability.
 *
 * This function handles DockYard bookkeeping only. The caller is responsible
 * for triggering the actual rollback through the deploy provider (e.g.,
 * redeploying the target version via the Dokploy adapter).
 *
 * @param projectSlug - The project's URL slug
 * @param targetDeployEventId - The deployment event to roll back to
 * @param options - Additional options (e.g., triggeredBy user ID)
 * @returns Details of the rollback operation
 * @throws ApiError NOT_FOUND if the project or target deployment does not exist
 * @throws ApiError BAD_REQUEST if the target deployment is not for the specified project
 * @throws ApiError BAD_REQUEST if the target deployment was not successful
 */
export async function triggerRollback(
  projectSlug: string,
  targetDeployEventId: string,
  options: TriggerRollbackOptions = {}
): Promise<RollbackResult> {
  const projectId = await resolveProjectId(projectSlug);

  log.info(
    { projectSlug, projectId, targetDeployEventId, triggeredBy: options.triggeredBy },
    "Rollback initiated"
  );

  return rollbackToDeployment(projectId, targetDeployEventId, options);
}

/**
 * Roll back a project to a previous deployment by project ID.
 *
 * Creates a new deployment_event with status "rolled_back" that captures
 * the target deployment's version and commit SHA. Also records an audit
 * log entry for the rollback action.
 *
 * @param projectId - The project's database ID
 * @param targetDeployEventId - The deployment event to roll back to
 * @param options - Additional options
 * @returns Details of the rollback operation
 */
export async function rollbackToDeployment(
  projectId: string,
  targetDeployEventId: string,
  options: TriggerRollbackOptions = {}
): Promise<RollbackResult> {
  const targetDeploy = await db.query.deploymentEvents.findFirst({
    where: eq(deploymentEvents.id, targetDeployEventId),
  });

  if (!targetDeploy) {
    throw new ApiError("NOT_FOUND", "Target deployment event not found");
  }

  if (targetDeploy.projectId !== projectId) {
    throw new ApiError(
      "BAD_REQUEST",
      "Target deployment does not belong to the specified project"
    );
  }

  if (targetDeploy.status !== "success") {
    log.warn(
      { projectId, targetDeployEventId, targetStatus: targetDeploy.status },
      "Rollback rejected — target deployment is not successful"
    );
    throw new ApiError(
      "BAD_REQUEST",
      `Cannot roll back to a deployment with status "${targetDeploy.status}" — only successful deployments are valid rollback targets`
    );
  }

  const triggeredBy = options.triggeredBy ?? "rollback";

  const [rollbackEvent] = await db
    .insert(deploymentEvents)
    .values({
      projectId,
      version: targetDeploy.version,
      commitSha: targetDeploy.commitSha,
      commitMessage: `Rollback to ${targetDeploy.version ?? targetDeploy.commitSha ?? targetDeployEventId}`,
      environment: targetDeploy.environment,
      status: "rolled_back",
      triggeredBy,
      dokployDeployId: targetDeploy.dokployDeployId,
    })
    .returning();

  await db.insert(auditLogs).values({
    actorId: options.triggeredBy,
    action: "deployment.rollback",
    targetType: "deployment_event",
    targetId: rollbackEvent.id,
    diff: {
      rollbackEventId: rollbackEvent.id,
      targetDeployEventId,
      projectId,
      targetVersion: targetDeploy.version,
      targetCommitSha: targetDeploy.commitSha,
    },
  });

  log.info(
    {
      rollbackEventId: rollbackEvent.id,
      projectId,
      targetDeployEventId,
      targetVersion: targetDeploy.version,
      targetCommitSha: targetDeploy.commitSha,
    },
    "Rollback completed"
  );

  return {
    id: rollbackEvent.id,
    rollbackEventId: rollbackEvent.id,
    targetDeployEventId,
    projectId,
    targetVersion: targetDeploy.version,
    targetCommitSha: targetDeploy.commitSha,
  };
}

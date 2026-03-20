/**
 * Deployment diff service for DockYard.
 *
 * Computes the difference between two consecutive deployments for a project:
 * the commit range, commit messages, files changed count, and any config
 * changes that occurred between the two deploy timestamps (from the
 * config audit log).
 */

import { eq, and, lt, gte, lte, desc } from "drizzle-orm";
import { db } from "@/db/connection";
import { deploymentEvents, configAuditLog, signalEvents } from "@/db/schema";
import { resolveProjectId } from "@/lib/auth/permissions";

/** A config change that occurred between two deployments. */
export interface ConfigChange {
  configEntryId: string;
  oldValueHash: string | null;
  newValueHash: string | null;
  changedAt: Date;
  changeReason: string | null;
}

/** Result of computing a deployment diff. */
export interface DeployDiff {
  /** The deployment event this diff is for. */
  deployEventId: string;
  /** The previous deployment event (if any). */
  previousDeployEventId: string | null;
  /** Commit SHA range (previousSha..currentSha). */
  commitRange: string | null;
  /** Commit messages from signal events between the two deploys. */
  commitMessages: string[];
  /** Number of unique files changed (from signal event payloads). */
  filesChangedCount: number;
  /** Config audit log entries between the two deploy timestamps. */
  configChanges: ConfigChange[];
}

/**
 * Compute the diff between a deployment and its predecessor.
 *
 * Finds the previous successful deployment for the same project,
 * extracts commit messages and file change counts from signal events,
 * and gathers config audit log entries between the two deploy timestamps.
 *
 * @param projectSlug - The project's URL slug (used for permission checks upstream)
 * @param deployEventId - The deployment event to compute the diff for
 * @returns The deployment diff, or null if the deployment event does not exist
 * @throws ApiError NOT_FOUND if the project slug does not exist
 */
export async function getDeployDiff(
  projectSlug: string,
  deployEventId: string
): Promise<DeployDiff | null> {
  await resolveProjectId(projectSlug);

  const currentDeploy = await db.query.deploymentEvents.findFirst({
    where: eq(deploymentEvents.id, deployEventId),
  });

  if (!currentDeploy) {
    return null;
  }

  const previousDeploy = await db.query.deploymentEvents.findFirst({
    where: and(
      eq(deploymentEvents.projectId, currentDeploy.projectId),
      eq(deploymentEvents.status, "success"),
      lt(deploymentEvents.deployedAt, currentDeploy.deployedAt)
    ),
    orderBy: desc(deploymentEvents.deployedAt),
  });

  const commitRange = buildCommitRange(
    previousDeploy?.commitSha ?? null,
    currentDeploy.commitSha
  );

  const commitMessages = await getCommitMessagesBetween(
    currentDeploy.projectId,
    previousDeploy?.deployedAt ?? null,
    currentDeploy.deployedAt
  );

  const filesChangedCount = await getFilesChangedCount(
    currentDeploy.projectId,
    previousDeploy?.deployedAt ?? null,
    currentDeploy.deployedAt
  );

  const configChanges = await getConfigChangesBetween(
    currentDeploy.projectId,
    previousDeploy?.deployedAt ?? null,
    currentDeploy.deployedAt
  );

  return {
    deployEventId,
    previousDeployEventId: previousDeploy?.id ?? null,
    commitRange,
    commitMessages,
    filesChangedCount,
    configChanges,
  };
}

/**
 * Build a commit range string (e.g., "abc123..def456").
 */
function buildCommitRange(
  previousSha: string | null,
  currentSha: string | null
): string | null {
  if (!currentSha) return null;
  if (!previousSha) return currentSha;
  return `${previousSha}..${currentSha}`;
}

/**
 * Get commit messages from signal events between two deployment timestamps.
 */
async function getCommitMessagesBetween(
  projectId: string,
  from: Date | null,
  to: Date
): Promise<string[]> {
  const conditions = [
    eq(signalEvents.projectId, projectId),
    eq(signalEvents.source, "github"),
    eq(signalEvents.eventType, "push"),
    lte(signalEvents.createdAt, to),
  ];

  if (from) {
    conditions.push(gte(signalEvents.createdAt, from));
  }

  const signals = await db.query.signalEvents.findMany({
    where: and(...conditions),
    orderBy: desc(signalEvents.createdAt),
  });

  const messages: string[] = [];
  for (const signal of signals) {
    const payload = signal.rawPayload as Record<string, unknown> | null;
    const message = payload?.commitMessage as string | undefined;
    if (message) {
      messages.push(message);
    }
  }

  return messages;
}

/**
 * Count unique files changed from signal event payloads between two timestamps.
 */
async function getFilesChangedCount(
  projectId: string,
  from: Date | null,
  to: Date
): Promise<number> {
  const conditions = [
    eq(signalEvents.projectId, projectId),
    eq(signalEvents.source, "github"),
    eq(signalEvents.eventType, "push"),
    lte(signalEvents.createdAt, to),
  ];

  if (from) {
    conditions.push(gte(signalEvents.createdAt, from));
  }

  const signals = await db.query.signalEvents.findMany({
    where: and(...conditions),
  });

  const uniqueFiles = new Set<string>();
  for (const signal of signals) {
    const payload = signal.rawPayload as Record<string, unknown> | null;
    const files = payload?.filesChanged as string[] | undefined;
    if (Array.isArray(files)) {
      for (const file of files) {
        uniqueFiles.add(file);
      }
    }
  }

  return uniqueFiles.size;
}

/**
 * Get config audit log entries between two deployment timestamps.
 */
async function getConfigChangesBetween(
  projectId: string,
  from: Date | null,
  to: Date
): Promise<ConfigChange[]> {
  const conditions = [
    eq(configAuditLog.projectId, projectId),
    lte(configAuditLog.changedAt, to),
  ];

  if (from) {
    conditions.push(gte(configAuditLog.changedAt, from));
  }

  const entries = await db.query.configAuditLog.findMany({
    where: and(...conditions),
    orderBy: desc(configAuditLog.changedAt),
  });

  return entries.map((entry) => ({
    configEntryId: entry.configEntryId,
    oldValueHash: entry.oldValueHash,
    newValueHash: entry.newValueHash,
    changedAt: new Date(entry.changedAt),
    changeReason: entry.changeReason,
  }));
}

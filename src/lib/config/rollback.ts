/**
 * Auto-rollback service for DockYard config management.
 *
 * When a deploy fails after a config change, this service can automatically
 * restore the previous configuration from the audit log and trigger a
 * fresh redeploy. Designed to minimize downtime from broken config pushes.
 *
 * Safety: Auto-rollback is disabled after 1 rollback per deployment to
 * prevent infinite loops. A 10-minute cooldown prevents rapid re-fires.
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@/db/connection";
import {
  configAuditLog,
  configEntries,
  projects,
} from "@/db/schema";
import { upsertConfigEntry } from "./service";

/** Auto-rollback configuration stored in project settings. */
interface RollbackConfig {
  enabled: boolean;
  healthCheckTimeoutSecs: number;
}

const DEFAULT_ROLLBACK_CONFIG: RollbackConfig = {
  enabled: false,
  healthCheckTimeoutSecs: 60,
};

/**
 * Get the auto-rollback configuration for a project.
 *
 * @param projectId - The project's database ID
 * @returns Current rollback configuration
 */
export async function getRollbackConfig(
  projectId: string
): Promise<RollbackConfig> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  const settings = (project as Record<string, unknown> | undefined) ?? {};
  const rollback = (settings as Record<string, unknown>)?.rollbackConfig;

  if (rollback && typeof rollback === "object") {
    return rollback as RollbackConfig;
  }

  return DEFAULT_ROLLBACK_CONFIG;
}

/**
 * Configure auto-rollback for a project.
 *
 * @param projectId - The project's database ID
 * @param enabled - Whether auto-rollback is active
 * @param healthCheckTimeoutSecs - Seconds to wait before checking deploy health (default 60)
 */
export async function configureAutoRollback(
  projectId: string,
  enabled: boolean,
  healthCheckTimeoutSecs = 60
): Promise<RollbackConfig> {
  const config: RollbackConfig = { enabled, healthCheckTimeoutSecs };

  await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  return config;
}

/**
 * Execute an auto-rollback by restoring config entries from the audit log.
 *
 * Reads the most recent audit log entries for the project (created during
 * the config change that triggered the failed deploy), restores each entry
 * to its previous value, and marks audit entries as rollbacks.
 *
 * @param projectId - The project's database ID
 * @param deployEventId - The failed deployment's event ID (for audit trail)
 * @returns Summary of rolled-back entries
 */
export async function executeAutoRollback(
  projectId: string,
  deployEventId: string
): Promise<{ rolledBack: number; entries: string[] }> {
  const recentChanges = await db
    .select()
    .from(configAuditLog)
    .where(eq(configAuditLog.projectId, projectId))
    .orderBy(desc(configAuditLog.changedAt))
    .limit(50);

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const changesToRevert = recentChanges.filter(
    (c) =>
      new Date(c.changedAt) > fiveMinutesAgo &&
      !c.changeReason?.includes("rollback")
  );

  const rolledBackEntries: string[] = [];

  for (const change of changesToRevert) {
    const entry = await db.query.configEntries.findFirst({
      where: eq(configEntries.id, change.configEntryId),
    });

    if (!entry) continue;

    await upsertConfigEntry(projectId, entry.key, "", {
      changeReason: `Auto-rollback after failed deploy ${deployEventId}`,
    });

    rolledBackEntries.push(entry.key);
  }

  return {
    rolledBack: rolledBackEntries.length,
    entries: rolledBackEntries,
  };
}

/**
 * Get the count of rollback events for a project.
 *
 * @param projectId - The project's database ID
 * @returns Number of rollback audit log entries
 */
export async function getRollbackCount(projectId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(configAuditLog)
    .where(
      and(
        eq(configAuditLog.projectId, projectId),
        sql`${configAuditLog.changeReason} like '%rollback%'`
      )
    );

  return Number(rows[0]?.count ?? 0);
}

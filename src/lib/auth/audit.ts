/**
 * Audit logging service for DockYard.
 *
 * Records every mutation operation with actor identity, action performed,
 * target resource, and a before/after diff. The audit_logs table is
 * append-only — entries are never updated or deleted.
 *
 * @example
 * ```ts
 * await logAudit({
 *   actorId: user.id,
 *   action: "config.update",
 *   targetType: "config_entry",
 *   targetId: entry.id,
 *   diff: { key: "DB_HOST", before: "old", after: "new" },
 *   request,
 * });
 * ```
 */

import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db } from "@/db/connection";
import { auditLogs } from "@/db/schema";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("auth.audit");

/** Input for creating an audit log entry. */
export interface AuditLogInput {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  diff?: Record<string, unknown>;
  /** The incoming HTTP request (used to extract IP and user-agent). */
  request?: Request;
}

/** Filters for querying the audit log. */
export interface AuditLogFilters {
  actorId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Record an audit log entry.
 *
 * Extracts IP address and user-agent from the request headers
 * and inserts an append-only record into the audit_logs table.
 *
 * @param input - Audit log entry data
 */
export async function logAudit(input: AuditLogInput): Promise<void> {
  let actorIp: string | null = null;
  let actorUserAgent: string | null = null;

  if (input.request) {
    actorIp =
      input.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      input.request.headers.get("x-real-ip") ??
      null;
    actorUserAgent = input.request.headers.get("user-agent") ?? null;
  }

  try {
    await db.insert(auditLogs).values({
      actorId: input.actorId === "anonymous" ? null : input.actorId,
      actorIp,
      actorUserAgent,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      diff: input.diff ?? null,
    });

    log.info(
      { actorId: input.actorId, action: input.action, targetType: input.targetType, targetId: input.targetId },
      "audit event recorded"
    );
  } catch (err) {
    log.error(
      { err, actorId: input.actorId, action: input.action, targetType: input.targetType, targetId: input.targetId },
      "failed to write audit log — swallowed to preserve API response"
    );
    // Do NOT re-throw: audit failures must never crash a successful mutation
  }
}

/**
 * Query the audit log with pagination and filters.
 *
 * @param filters - Optional filters for actor, action, target, date range
 * @returns Paginated array of audit log entries
 */
export async function getAuditLog(filters: AuditLogFilters = {}) {
  const conditions = [];

  if (filters.actorId) {
    conditions.push(eq(auditLogs.actorId, filters.actorId));
  }
  if (filters.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }
  if (filters.targetType) {
    conditions.push(eq(auditLogs.targetType, filters.targetType));
  }
  if (filters.targetId) {
    conditions.push(eq(auditLogs.targetId, filters.targetId));
  }
  if (filters.startDate) {
    conditions.push(gte(auditLogs.timestamp, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(auditLogs.timestamp, filters.endDate));
  }

  const query = db
    .select()
    .from(auditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.timestamp))
    .limit(filters.limit ?? 50)
    .offset(filters.offset ?? 0);

  return query;
}

/**
 * Get the audit history for a specific entity.
 *
 * @param targetType - The entity type (e.g., 'project', 'config_entry')
 * @param targetId - The entity's database ID
 * @returns Array of audit log entries for the entity, newest first
 */
export async function getAuditLogForEntity(
  targetType: string,
  targetId: string
) {
  return db
    .select()
    .from(auditLogs)
    .where(
      and(eq(auditLogs.targetType, targetType), eq(auditLogs.targetId, targetId))
    )
    .orderBy(desc(auditLogs.timestamp))
    .limit(100);
}

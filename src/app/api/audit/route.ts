/**
 * GET /api/audit
 *
 * Returns paginated audit log entries. Supports filtering by actor,
 * action, target type, and date range via query parameters.
 *
 * Query params:
 * - limit (number, default 50, max 100)
 * - offset (number, default 0)
 * - actorId (uuid)
 * - action (string, e.g. "settings.update")
 * - targetType (string, e.g. "platform_settings")
 *
 * Response: { entries: AuditLog[], total: number }
 */

import { NextResponse } from "next/server";
import { count, and, eq, desc } from "drizzle-orm";
import { db } from "@/db/connection";
import { auditLogs } from "@/db/schema";
import { withAuth } from "@/lib/auth/guards";

export const GET = withAuth(async (request) => {
  const url = new URL(request.url);

  const limitParam = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const limit = Math.min(Math.max(1, limitParam), 100);
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10));
  const actorId = url.searchParams.get("actorId");
  const action = url.searchParams.get("action");
  const targetType = url.searchParams.get("targetType");

  const conditions = [];
  if (actorId) conditions.push(eq(auditLogs.actorId, actorId));
  if (action) conditions.push(eq(auditLogs.action, action));
  if (targetType) conditions.push(eq(auditLogs.targetType, targetType));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [entries, [totalResult]] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(auditLogs)
      .where(where),
  ]);

  return NextResponse.json({
    entries,
    total: totalResult?.count ?? 0,
  });
});

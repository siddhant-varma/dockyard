/**
 * Deep health check: database schema completeness.
 *
 * Compares the tables defined in the Drizzle schema against what actually
 * exists in the production database. Reports missing tables as errors.
 * This catches the class of bug where new tables are added to schema.ts
 * but `drizzle-kit push` was never run against the target database.
 *
 * @module health/checks/schema
 */

import { db } from "@/db/connection";
import { sql } from "drizzle-orm";
import {
  type DeepCheckResult,
  elapsed,
  errorMessage,
  rejectAfterTimeout,
} from "./types";

/**
 * All table names defined in src/db/schema.ts.
 * Must be kept in sync when new tables are added.
 */
const EXPECTED_TABLES = [
  "users",
  "accounts",
  "verification_tokens",
  "projects",
  "project_memberships",
  "discovery_sources",
  "project_health",
  "health_check_results",
  "deployment_events",
  "signal_events",
  "alert_rules",
  "alert_events",
  "incidents",
  "notes",
  "slo_budgets",
  "metric_points",
  "hetzner_snapshots",
  "billing_estimates",
  "config_entries",
  "config_audit_log",
  "config_templates",
  "notification_channels",
  "platform_settings",
  "ai_context_snapshots",
  "checkpoints",
  "roadmap_items",
  "test_configs",
  "test_runs",
  "kuma_monitors",
  "audit_logs",
  "revoked_sessions",
  "mfa_credentials",
] as const;

/** Check that all expected tables exist in the database. */
export async function checkSchema(): Promise<DeepCheckResult> {
  const start = performance.now();
  try {
    const result = await Promise.race([
      (async () => {
        const rows = await db.execute<{ tablename: string }>(
          sql`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`
        );
        const existing = new Set(
          Array.isArray(rows) ? rows.map((r) => r.tablename) : []
        );
        const missing = EXPECTED_TABLES.filter((t) => !existing.has(t));

        if (missing.length > 0) {
          return {
            slug: "schema",
            name: "DB Schema",
            status: "error" as const,
            critical: true,
            latencyMs: elapsed(start),
            error: `Missing ${missing.length} table(s): ${missing.join(", ")}. Run drizzle-kit push.`,
          };
        }

        return {
          slug: "schema",
          name: "DB Schema",
          status: "ok" as const,
          critical: true,
          latencyMs: elapsed(start),
        };
      })(),
      rejectAfterTimeout("DB Schema"),
    ]);
    return result;
  } catch (err) {
    return {
      slug: "schema",
      name: "DB Schema",
      status: "error",
      critical: true,
      latencyMs: elapsed(start),
      error: errorMessage(err),
    };
  }
}

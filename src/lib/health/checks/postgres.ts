/**
 * PostgreSQL connectivity check — runs `SELECT 1` via Drizzle ORM.
 * @module health/checks/postgres
 */

import { db } from "@/db/connection";
import { sql } from "drizzle-orm";
import { type DeepCheckResult, elapsed, rejectAfterTimeout } from "./types";

/** Check PostgreSQL connectivity by running `SELECT 1`. */
export async function checkPostgres(): Promise<DeepCheckResult> {
  const start = performance.now();
  try {
    await Promise.race([
      db.execute(sql`SELECT 1`),
      rejectAfterTimeout("PostgreSQL"),
    ]);
    return {
      slug: "postgres",
      name: "PostgreSQL",
      status: "ok",
      critical: true,
      latencyMs: elapsed(start),
    };
  } catch (err) {
    return {
      slug: "postgres",
      name: "PostgreSQL",
      status: "error",
      critical: true,
      latencyMs: elapsed(start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

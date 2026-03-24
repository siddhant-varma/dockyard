/**
 * TimescaleDB extension check — verifies the extension is installed.
 * @module health/checks/timescaledb
 */

import { db } from "@/db/connection";
import { sql } from "drizzle-orm";
import { type DeepCheckResult, elapsed } from "./types";

/** Check that the TimescaleDB extension is installed and return its version. */
export async function checkTimescaleDB(): Promise<DeepCheckResult> {
  const start = performance.now();
  try {
    const rows = await db.execute(
      sql`SELECT extversion FROM pg_extension WHERE extname = 'timescaledb'`
    );
    const resultRows = rows as unknown as Array<{ extversion?: string }>;
    if (!resultRows || resultRows.length === 0) {
      return {
        slug: "timescaledb",
        name: "TimescaleDB",
        status: "error",
        critical: false,
        latencyMs: elapsed(start),
        error: "TimescaleDB extension not installed",
      };
    }
    return {
      slug: "timescaledb",
      name: "TimescaleDB",
      status: "ok",
      critical: false,
      latencyMs: elapsed(start),
    };
  } catch (err) {
    return {
      slug: "timescaledb",
      name: "TimescaleDB",
      status: "error",
      critical: false,
      latencyMs: elapsed(start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

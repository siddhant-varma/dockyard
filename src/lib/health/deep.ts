/**
 * Deep health check orchestrator for DockYard's dependencies.
 *
 * Runs all registered checks in parallel and aggregates results.
 * Supports running a single check by slug via `checkSingle()`.
 *
 * Results are cached in memory for 30 seconds (full scans only).
 * Single-check requests bypass the cache.
 *
 * @module health/deep
 */

import { createModuleLogger } from "@/lib/logger";
import { CHECK_REGISTRY, type DeepCheckResult } from "./checks";

export type { DeepCheckResult } from "./checks";
export { getCheckSlugs } from "./checks";

const log = createModuleLogger("health.deep");

/** Cache TTL — full results are reused if younger than 30 seconds. */
const CACHE_TTL_MS = 30_000;

/** Aggregate deep health response including all individual checks. */
export interface DeepHealthResponse {
  /** Overall status — "ok" if no critical checks fail, "degraded" if any critical check fails. */
  status: "ok" | "degraded";
  /** Individual dependency check results. */
  checks: DeepCheckResult[];
  /** ISO timestamp of when the check was performed. */
  checkedAt: string;
  /** Whether this response was served from cache. */
  cached: boolean;
}

// ── In-memory cache ──────────────────────────────────────────────

let cachedResult: DeepHealthResponse | null = null;
let cachedAt = 0;

/** Reset the in-memory cache. Exported for testing only. */
export function _resetCache(): void {
  cachedResult = null;
  cachedAt = 0;
}

/**
 * Run all dependency health checks and return aggregate results.
 *
 * Uses a 30-second in-memory cache — if the last check was less than
 * 30 seconds ago, the cached result is returned immediately.
 *
 * Overall status is "degraded" only if a critical check fails.
 * Optional check failures are reported individually but don't
 * affect the aggregate status.
 *
 * @returns Aggregate deep health response with per-dependency results
 */
export async function checkDeepHealth(): Promise<DeepHealthResponse> {
  const now = Date.now();

  if (cachedResult && now - cachedAt < CACHE_TTL_MS) {
    log.debug("Returning cached deep health results");
    return { ...cachedResult, cached: true };
  }

  log.info("Running deep health checks");

  const checkFns = [...CHECK_REGISTRY.values()];
  const checks = await Promise.all(checkFns.map((fn) => fn()));

  const hasCriticalError = checks.some(
    (c) => c.critical && c.status === "error"
  );

  const response: DeepHealthResponse = {
    status: hasCriticalError ? "degraded" : "ok",
    checks,
    checkedAt: new Date().toISOString(),
    cached: false,
  };

  cachedResult = response;
  cachedAt = Date.now();

  log.info(
    { status: response.status, checkCount: checks.length },
    "Deep health checks completed"
  );

  return response;
}

/**
 * Run a single health check by its slug.
 *
 * Bypasses the full-scan cache — single checks always run fresh.
 * Returns null if the slug is not found in the registry.
 *
 * @param slug - The stable identifier (e.g., "postgres", "kuma")
 * @returns Single check result, or null if slug unknown
 */
export async function checkSingle(
  slug: string
): Promise<DeepCheckResult | null> {
  const checkFn = CHECK_REGISTRY.get(slug);
  if (!checkFn) return null;

  log.debug({ slug }, "Running single health check");
  return checkFn();
}

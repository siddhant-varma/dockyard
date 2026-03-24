/**
 * Deep health checker for DockYard's internal dependencies.
 *
 * Performs lightweight checks against each dependency (PostgreSQL, Inngest,
 * Dokploy deploy platform API, Hetzner Cloud API, AES encryption) and
 * returns structured results with latency and error information.
 *
 * Results are cached in memory for 30 seconds to avoid hammering
 * dependencies on rapid successive calls.
 *
 * @module health/deep
 */

import { db } from "@/db/connection";
import { sql } from "drizzle-orm";
import { encrypt, decrypt } from "@/lib/crypto/aes";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("health.deep");

/** Timeout for individual dependency checks (5 seconds). */
const CHECK_TIMEOUT_MS = 5000;

/** Cache TTL — results are reused if younger than 30 seconds. */
const CACHE_TTL_MS = 30_000;

/** Result of a single dependency health check. */
export interface DeepCheckResult {
  /** Human-readable dependency name. */
  name: string;
  /** Whether the check passed or failed. */
  status: "ok" | "error";
  /** Round-trip time for the check in milliseconds. */
  latencyMs: number;
  /** Error message if the check failed. */
  error?: string;
}

/** Aggregate deep health response including all individual checks. */
export interface DeepHealthResponse {
  /** Overall status — "ok" if all checks pass, "degraded" if any fail. */
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

/**
 * Run all dependency health checks and return aggregate results.
 *
 * Uses a 30-second in-memory cache — if the last check was less than
 * 30 seconds ago, the cached result is returned immediately.
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

  const checks = await Promise.all([
    checkPostgres(),
    checkInngest(),
    checkDokploy(),
    checkHetzner(),
    checkEncryption(),
  ]);

  const hasError = checks.some((c) => c.status === "error");

  const response: DeepHealthResponse = {
    status: hasError ? "degraded" : "ok",
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

// ── Individual checks ────────────────────────────────────────────

/**
 * Check PostgreSQL connectivity by running `SELECT 1` via Drizzle ORM.
 */
async function checkPostgres(): Promise<DeepCheckResult> {
  const start = performance.now();
  try {
    await Promise.race([
      db.execute(sql`SELECT 1`),
      rejectAfterTimeout("PostgreSQL"),
    ]);
    return {
      name: "PostgreSQL",
      status: "ok",
      latencyMs: elapsed(start),
    };
  } catch (err) {
    return {
      name: "PostgreSQL",
      status: "error",
      latencyMs: elapsed(start),
      error: errorMessage(err),
    };
  }
}

/**
 * Check Inngest availability by verifying the event key is configured.
 *
 * A full connectivity check requires a running Inngest server, so this
 * only validates that the `INNGEST_EVENT_KEY` environment variable is set.
 */
async function checkInngest(): Promise<DeepCheckResult> {
  const start = performance.now();
  try {
    const key = process.env.INNGEST_EVENT_KEY;
    if (!key) {
      return {
        name: "Inngest",
        status: "error",
        latencyMs: elapsed(start),
        error: "INNGEST_EVENT_KEY not configured",
      };
    }
    return {
      name: "Inngest",
      status: "ok",
      latencyMs: elapsed(start),
    };
  } catch (err) {
    return {
      name: "Inngest",
      status: "error",
      latencyMs: elapsed(start),
      error: errorMessage(err),
    };
  }
}

/**
 * Check the Dokploy deploy platform API by fetching its settings endpoint.
 *
 * Only runs when `DOKPLOY_API_URL` and `DOKPLOY_API_KEY` are configured.
 * Returns "ok" with a note if not configured (optional dependency).
 */
async function checkDokploy(): Promise<DeepCheckResult> {
  const start = performance.now();
  const apiUrl = process.env.DOKPLOY_API_URL;
  const apiKey = process.env.DOKPLOY_API_KEY;

  if (!apiUrl || !apiKey) {
    return {
      name: "Dokploy",
      status: "ok",
      latencyMs: elapsed(start),
      error: "Not configured (optional)",
    };
  }

  try {
    const response = await Promise.race([
      fetch(`${apiUrl}/api/settings.getAll`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      }),
      rejectAfterTimeout("Dokploy"),
    ]) as Response;

    if (!response.ok) {
      return {
        name: "Dokploy",
        status: "error",
        latencyMs: elapsed(start),
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    return {
      name: "Dokploy",
      status: "ok",
      latencyMs: elapsed(start),
    };
  } catch (err) {
    return {
      name: "Dokploy",
      status: "error",
      latencyMs: elapsed(start),
      error: errorMessage(err),
    };
  }
}

/**
 * Check the Hetzner Cloud API by fetching a single server listing.
 *
 * Only runs when `HETZNER_API_TOKEN` is configured.
 * Returns "ok" with a note if not configured (optional dependency).
 */
async function checkHetzner(): Promise<DeepCheckResult> {
  const start = performance.now();
  const token = process.env.HETZNER_API_TOKEN;

  if (!token) {
    return {
      name: "Hetzner Cloud",
      status: "ok",
      latencyMs: elapsed(start),
      error: "Not configured (optional)",
    };
  }

  try {
    const response = await Promise.race([
      fetch("https://api.hetzner.cloud/v1/servers?per_page=1", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      }),
      rejectAfterTimeout("Hetzner Cloud"),
    ]) as Response;

    if (!response.ok) {
      return {
        name: "Hetzner Cloud",
        status: "error",
        latencyMs: elapsed(start),
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    return {
      name: "Hetzner Cloud",
      status: "ok",
      latencyMs: elapsed(start),
    };
  } catch (err) {
    return {
      name: "Hetzner Cloud",
      status: "error",
      latencyMs: elapsed(start),
      error: errorMessage(err),
    };
  }
}

/**
 * Check AES-256-GCM encryption by performing an encrypt/decrypt round-trip.
 *
 * Only runs when `CONFIG_ENCRYPTION_KEY` is configured.
 * Returns "ok" with a note if not configured (optional dependency).
 */
async function checkEncryption(): Promise<DeepCheckResult> {
  const start = performance.now();
  const key = process.env.CONFIG_ENCRYPTION_KEY;

  if (!key) {
    return {
      name: "Encryption",
      status: "ok",
      latencyMs: elapsed(start),
      error: "CONFIG_ENCRYPTION_KEY not configured (optional)",
    };
  }

  try {
    const testValue = "dockyard-deep-health-check";
    const encrypted = encrypt(testValue);
    const decrypted = decrypt(encrypted);

    if (decrypted !== testValue) {
      return {
        name: "Encryption",
        status: "error",
        latencyMs: elapsed(start),
        error: "Round-trip mismatch — decrypted value differs from original",
      };
    }

    return {
      name: "Encryption",
      status: "ok",
      latencyMs: elapsed(start),
    };
  } catch (err) {
    return {
      name: "Encryption",
      status: "error",
      latencyMs: elapsed(start),
      error: errorMessage(err),
    };
  }
}

// ── Helpers ──────────────────────────────────────────────────────

/** Calculate elapsed milliseconds since a start time. */
function elapsed(start: number): number {
  return Math.round(performance.now() - start);
}

/** Extract a human-readable error message from an unknown error. */
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Create a promise that rejects after the check timeout. */
function rejectAfterTimeout(name: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`${name} check timed out (${CHECK_TIMEOUT_MS}ms)`)),
      CHECK_TIMEOUT_MS
    );
  });
}

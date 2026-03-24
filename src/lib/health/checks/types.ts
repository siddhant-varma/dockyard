/**
 * Shared types and helpers for deep health check functions.
 *
 * Each check module exports a single function that returns a `DeepCheckResult`.
 * The orchestrator in `deep.ts` imports and registers these via the check registry.
 *
 * @module health/checks/types
 */

/** Timeout for individual dependency checks (5 seconds). */
export const CHECK_TIMEOUT_MS = 5000;

/** Result of a single dependency health check. */
export interface DeepCheckResult {
  /** Stable identifier used in `?check=` query param (e.g., "postgres", "kuma"). */
  slug: string;
  /** Human-readable dependency name. */
  name: string;
  /** Whether the check passed or failed. */
  status: "ok" | "error";
  /** Whether this is a critical dependency. Critical failures → overall "degraded". */
  critical: boolean;
  /** Round-trip time for the check in milliseconds. */
  latencyMs: number;
  /** Error or informational message. */
  error?: string;
}

/** A check function that can be registered in the health check registry. */
export type CheckFn = () => Promise<DeepCheckResult>;

/** Calculate elapsed milliseconds since a performance.now() start time. */
export function elapsed(start: number): number {
  return Math.round(performance.now() - start);
}

/** Extract a human-readable error message from an unknown error. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Create a promise that rejects after the check timeout. */
export function rejectAfterTimeout(name: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(
      () =>
        reject(new Error(`${name} check timed out (${CHECK_TIMEOUT_MS}ms)`)),
      CHECK_TIMEOUT_MS
    );
  });
}

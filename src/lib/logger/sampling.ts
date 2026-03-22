/**
 * Log sampling rules for high-volume operations.
 *
 * Prevents log flooding from periodic tasks (health checks, metric scraping)
 * while ensuring all errors, mutations, and state transitions are always logged.
 *
 * @example
 * ```ts
 * import { shouldSample } from "@/lib/logger/sampling";
 *
 * if (shouldSample("health.success")) {
 *   log.debug({ project }, "Health check passed");
 * }
 * // Errors are never sampled — always logged:
 * log.error({ project, err }, "Health check failed");
 * ```
 */

/** Sampling rate per category (0 = never, 1 = always). */
const SAMPLING_RATES: Record<string, number> = {
  "health.success": 0.01,
  "metrics.scrape.success": 0.01,
  "api.read.success": 0.1,
  "sse.heartbeat": 0,
};

/**
 * Determine whether a log entry in the given category should be emitted.
 * Categories not listed default to 1.0 (always log).
 *
 * @param category - Dot-separated category (e.g., "health.success")
 * @returns true if the entry should be logged
 */
export function shouldSample(category: string): boolean {
  const rate = SAMPLING_RATES[category] ?? 1.0;
  if (rate === 0) return false;
  if (rate >= 1) return true;
  return Math.random() < rate;
}

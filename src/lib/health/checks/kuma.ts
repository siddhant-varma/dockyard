/**
 * Uptime Kuma reachability check — verifies the Kuma instance responds.
 *
 * Any HTTP response (even 401 or HTML) counts as reachable since Kuma's
 * API is Socket.IO-based with no clean REST health endpoint.
 *
 * @module health/checks/kuma
 */

import {
  type DeepCheckResult,
  elapsed,
  errorMessage,
  CHECK_TIMEOUT_MS,
} from "./types";

/** Check that the Uptime Kuma instance is reachable. */
export async function checkKuma(): Promise<DeepCheckResult> {
  const start = performance.now();
  const kumaUrl = process.env.KUMA_URL;

  if (!kumaUrl) {
    return {
      slug: "kuma",
      name: "Uptime Kuma",
      status: "ok",
      critical: false,
      latencyMs: elapsed(start),
      error: "Not configured (optional)",
    };
  }

  try {
    await fetch(kumaUrl, {
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });

    return {
      slug: "kuma",
      name: "Uptime Kuma",
      status: "ok",
      critical: false,
      latencyMs: elapsed(start),
    };
  } catch (err) {
    return {
      slug: "kuma",
      name: "Uptime Kuma",
      status: "error",
      critical: false,
      latencyMs: elapsed(start),
      error: errorMessage(err),
    };
  }
}

/**
 * Hetzner Cloud API check — fetches servers listing with real API token.
 * @module health/checks/hetzner
 */

import {
  type DeepCheckResult,
  elapsed,
  errorMessage,
  rejectAfterTimeout,
  CHECK_TIMEOUT_MS,
} from "./types";

/** Check Hetzner Cloud API connectivity using the configured token. */
export async function checkHetzner(): Promise<DeepCheckResult> {
  const start = performance.now();
  const token = process.env.HETZNER_API_TOKEN;

  if (!token) {
    return {
      slug: "hetzner",
      name: "Hetzner Cloud",
      status: "ok",
      critical: false,
      latencyMs: elapsed(start),
      error: "Not configured (optional)",
    };
  }

  try {
    const response = (await Promise.race([
      fetch("https://api.hetzner.cloud/v1/servers?per_page=1", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      }),
      rejectAfterTimeout("Hetzner Cloud"),
    ])) as Response;

    if (!response.ok) {
      return {
        slug: "hetzner",
        name: "Hetzner Cloud",
        status: "error",
        critical: false,
        latencyMs: elapsed(start),
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    return {
      slug: "hetzner",
      name: "Hetzner Cloud",
      status: "ok",
      critical: false,
      latencyMs: elapsed(start),
    };
  } catch (err) {
    return {
      slug: "hetzner",
      name: "Hetzner Cloud",
      status: "error",
      critical: false,
      latencyMs: elapsed(start),
      error: errorMessage(err),
    };
  }
}

/**
 * Dokploy deploy platform API check — fetches settings with real API key.
 * @module health/checks/dokploy
 */

import {
  type DeepCheckResult,
  elapsed,
  errorMessage,
  rejectAfterTimeout,
  CHECK_TIMEOUT_MS,
} from "./types";

/** Check Dokploy API connectivity using the configured API key. */
export async function checkDokploy(): Promise<DeepCheckResult> {
  const start = performance.now();
  const apiUrl = process.env.DOKPLOY_API_URL;
  const apiKey = process.env.DOKPLOY_API_KEY;

  if (!apiUrl || !apiKey) {
    return {
      slug: "dokploy",
      name: "Dokploy",
      status: "ok",
      critical: false,
      latencyMs: elapsed(start),
      error: "Not configured (optional)",
    };
  }

  try {
    const response = (await Promise.race([
      fetch(`${apiUrl}/api/settings.getAll`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      }),
      rejectAfterTimeout("Dokploy"),
    ])) as Response;

    if (!response.ok) {
      return {
        slug: "dokploy",
        name: "Dokploy",
        status: "error",
        critical: false,
        latencyMs: elapsed(start),
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    return {
      slug: "dokploy",
      name: "Dokploy",
      status: "ok",
      critical: false,
      latencyMs: elapsed(start),
    };
  } catch (err) {
    return {
      slug: "dokploy",
      name: "Dokploy",
      status: "error",
      critical: false,
      latencyMs: elapsed(start),
      error: errorMessage(err),
    };
  }
}

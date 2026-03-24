/**
 * GitHub API reachability check — hits the public rate_limit endpoint.
 *
 * Uses an unauthenticated request (60 req/hr limit). This proves GitHub's
 * API is reachable. Authenticated discovery checks happen separately.
 *
 * @module health/checks/github-api
 */

import {
  type DeepCheckResult,
  elapsed,
  errorMessage,
  CHECK_TIMEOUT_MS,
} from "./types";

/** Check that the GitHub API is reachable. */
export async function checkGitHubApi(): Promise<DeepCheckResult> {
  const start = performance.now();

  try {
    const response = await fetch("https://api.github.com/rate_limit", {
      headers: {
        Accept: "application/json",
        "User-Agent": "DockYard/0.1",
      },
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });

    if (response.status === 403) {
      return {
        slug: "github-api",
        name: "GitHub API",
        status: "error",
        critical: false,
        latencyMs: elapsed(start),
        error: "Rate limited by GitHub",
      };
    }

    if (!response.ok) {
      return {
        slug: "github-api",
        name: "GitHub API",
        status: "error",
        critical: false,
        latencyMs: elapsed(start),
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    return {
      slug: "github-api",
      name: "GitHub API",
      status: "ok",
      critical: false,
      latencyMs: elapsed(start),
    };
  } catch (err) {
    return {
      slug: "github-api",
      name: "GitHub API",
      status: "error",
      critical: false,
      latencyMs: elapsed(start),
      error: errorMessage(err),
    };
  }
}

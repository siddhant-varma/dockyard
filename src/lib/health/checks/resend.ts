/**
 * Resend email API check — validates API key by listing domains.
 *
 * Uses GET /domains which is a lightweight read-only operation.
 * Does NOT send any email.
 *
 * @module health/checks/resend
 */

import {
  type DeepCheckResult,
  elapsed,
  errorMessage,
  CHECK_TIMEOUT_MS,
} from "./types";

/** Check Resend API connectivity using the configured API key. */
export async function checkResend(): Promise<DeepCheckResult> {
  const start = performance.now();
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      slug: "resend",
      name: "Resend Email",
      status: "ok",
      critical: false,
      latencyMs: elapsed(start),
      error: "Not configured (optional)",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/domains", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });

    if (response.status === 401 || response.status === 403) {
      return {
        slug: "resend",
        name: "Resend Email",
        status: "error",
        critical: false,
        latencyMs: elapsed(start),
        error: `API key invalid (HTTP ${response.status})`,
      };
    }

    if (!response.ok) {
      return {
        slug: "resend",
        name: "Resend Email",
        status: "error",
        critical: false,
        latencyMs: elapsed(start),
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    return {
      slug: "resend",
      name: "Resend Email",
      status: "ok",
      critical: false,
      latencyMs: elapsed(start),
    };
  } catch (err) {
    return {
      slug: "resend",
      name: "Resend Email",
      status: "error",
      critical: false,
      latencyMs: elapsed(start),
      error: errorMessage(err),
    };
  }
}

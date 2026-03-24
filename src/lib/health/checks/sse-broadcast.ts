/**
 * SSE broadcast endpoint check — verifies internal real-time channel works.
 *
 * Sends a harmless `health.ping` event to the broadcast endpoint.
 * The frontend `useRealtimeData` hook ignores unrecognized event names.
 *
 * @module health/checks/sse-broadcast
 */

import {
  type DeepCheckResult,
  elapsed,
  errorMessage,
  CHECK_TIMEOUT_MS,
} from "./types";

/** Check that the SSE broadcast internal endpoint responds. */
export async function checkSseBroadcast(): Promise<DeepCheckResult> {
  const start = performance.now();
  const secret = process.env.SSE_BROADCAST_SECRET;
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  if (!secret) {
    return {
      slug: "sse",
      name: "SSE Broadcast",
      status: "ok",
      critical: false,
      latencyMs: elapsed(start),
      error: "SSE_BROADCAST_SECRET not configured (optional)",
    };
  }

  try {
    const response = await fetch(`${baseUrl}/api/sse/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ event: "health.ping", data: {} }),
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });

    if (response.status === 401) {
      return {
        slug: "sse",
        name: "SSE Broadcast",
        status: "error",
        critical: false,
        latencyMs: elapsed(start),
        error: "SSE_BROADCAST_SECRET mismatch",
      };
    }

    if (!response.ok) {
      return {
        slug: "sse",
        name: "SSE Broadcast",
        status: "error",
        critical: false,
        latencyMs: elapsed(start),
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    return {
      slug: "sse",
      name: "SSE Broadcast",
      status: "ok",
      critical: false,
      latencyMs: elapsed(start),
    };
  } catch (err) {
    return {
      slug: "sse",
      name: "SSE Broadcast",
      status: "error",
      critical: false,
      latencyMs: elapsed(start),
      error: errorMessage(err),
    };
  }
}

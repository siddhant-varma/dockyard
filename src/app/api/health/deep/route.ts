/**
 * GET /api/health/deep
 *
 * Deep health check endpoint for DockYard's internal dependencies.
 *
 * Authentication: requires EITHER a valid session (withAuth) OR a
 * `?token=<HEALTH_MONITOR_TOKEN>` query parameter for external monitors
 * like Uptime Kuma that cannot send session cookies.
 *
 * Supports an optional `?check=<slug>` query parameter to run a single
 * dependency check. When provided, returns only that check's result
 * (bypasses the 30-second cache). When omitted, runs all 13 checks.
 *
 * Examples:
 *   GET /api/health/deep                                → all checks (auth required)
 *   GET /api/health/deep?token=<secret>                 → all checks (token auth)
 *   GET /api/health/deep?check=postgres&token=<secret>  → PostgreSQL only
 *
 * Returns per-dependency status with latency, plus an aggregate status:
 * - "ok" if no critical checks fail
 * - "degraded" if any critical check fails
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/guards";
import { apiSuccess, apiError } from "@/lib/api/response";
import { checkDeepHealth, checkSingle, getCheckSlugs } from "@/lib/health/deep";

/** Run the health check logic and return a response. */
async function handleDeepHealth(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const checkSlug = url.searchParams.get("check");

  // Single-check mode: run one check by slug, bypass cache
  if (checkSlug) {
    const result = await checkSingle(checkSlug);
    if (!result) {
      return apiError(
        "UNKNOWN_CHECK",
        `Unknown check: "${checkSlug}". Valid slugs: ${getCheckSlugs().join(", ")}`,
        400
      );
    }

    return apiSuccess({
      status: result.status === "ok" ? "ok" : "degraded",
      checks: [result],
      checkedAt: new Date().toISOString(),
      cached: false,
    });
  }

  // Full-check mode: run all checks, use 30s cache
  const result = await checkDeepHealth();
  return apiSuccess(result);
}

/**
 * Validate the monitor token from the `?token=` query parameter.
 * Returns true if the token matches `HEALTH_MONITOR_TOKEN` env var.
 */
function isValidMonitorToken(request: Request): boolean {
  const secret = process.env.HEALTH_MONITOR_TOKEN;
  if (!secret) return false;

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  return token === secret;
}

/**
 * Route handler — checks for monitor token first (for Kuma),
 * falls through to session auth (for UI/API clients).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Token-based auth bypass for external monitors (Uptime Kuma)
  if (isValidMonitorToken(request)) {
    return handleDeepHealth(request);
  }

  // Fall through to standard session auth
  return withAuth(handleDeepHealth)(request);
}

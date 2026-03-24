/**
 * GET /api/health/deep
 *
 * Authenticated deep health check endpoint for DockYard's internal dependencies.
 * Unlike the public `/api/health` endpoint, this route requires authentication
 * because it reveals infrastructure details (database connectivity, API keys,
 * external service reachability).
 *
 * Supports an optional `?check=<slug>` query parameter to run a single
 * dependency check. When provided, returns only that check's result
 * (bypasses the 30-second cache). When omitted, runs all 13 checks.
 *
 * Examples:
 *   GET /api/health/deep              → all checks, cached 30s
 *   GET /api/health/deep?check=postgres → PostgreSQL only, always fresh
 *   GET /api/health/deep?check=kuma     → Kuma reachability only
 *
 * Returns per-dependency status with latency, plus an aggregate status:
 * - "ok" if no critical checks fail
 * - "degraded" if any critical check fails
 */

import { withAuth } from "@/lib/auth/guards";
import { apiSuccess, apiError } from "@/lib/api/response";
import { checkDeepHealth, checkSingle, getCheckSlugs } from "@/lib/health/deep";

export const GET = withAuth(async (request: Request) => {
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
});

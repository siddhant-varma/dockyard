/**
 * GET /api/health/deep
 *
 * Authenticated deep health check endpoint for DockYard's internal dependencies.
 * Unlike the public `/api/health` endpoint, this route requires authentication
 * because it reveals infrastructure details (database connectivity, API keys,
 * external service reachability).
 *
 * Returns per-dependency status with latency, plus an aggregate status:
 * - "ok" if all checks pass
 * - "degraded" if any check fails
 *
 * Results are cached in memory for 30 seconds to limit load on dependencies.
 */

import { withAuth } from "@/lib/auth/guards";
import { apiSuccess } from "@/lib/api/response";
import { checkDeepHealth } from "@/lib/health/deep";

export const GET = withAuth(async () => {
  const result = await checkDeepHealth();
  return apiSuccess(result);
});

import { apiSuccess } from "@/lib/api/response";

/**
 * GET /api/health
 * DockYard's own health check endpoint.
 * Returns platform status for external monitoring (e.g., Uptime Kuma).
 */
export function GET() {
  return apiSuccess({
    status: "ok",
    version: "0.1.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

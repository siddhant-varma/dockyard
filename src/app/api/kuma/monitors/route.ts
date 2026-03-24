/**
 * Kuma monitors API proxy — list and create monitors.
 *
 * All Uptime Kuma API calls are proxied through DockYard to enforce
 * authentication and audit logging. The frontend never calls
 * the Kuma API directly.
 *
 * GET  /api/kuma/monitors — List all monitors
 * POST /api/kuma/monitors — Create a new monitor
 */

import { withAuth } from "@/lib/auth/guards";
import { getKumaClient } from "@/lib/kuma/client";
import { apiError, apiSuccess } from "@/lib/api/response";
import { logAudit } from "@/lib/auth/audit";
import type { CreateMonitorInput } from "@/lib/kuma/types";

/**
 * GET /api/kuma/monitors — List all Uptime Kuma monitors.
 *
 * Returns an array of all configured monitors with their current status,
 * uptime percentages, and configuration.
 */
export const GET = withAuth(async () => {
  const client = getKumaClient();
  if (!client) {
    return apiError(
      "BAD_REQUEST",
      "Uptime Kuma is not configured. Set KUMA_URL, KUMA_USERNAME, and KUMA_PASSWORD.",
      503
    );
  }

  try {
    const monitors = await client.getMonitors();
    return apiSuccess(monitors);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", `Failed to fetch monitors: ${message}`, 502);
  }
});

/**
 * POST /api/kuma/monitors — Create a new monitor in Uptime Kuma.
 *
 * Request body must conform to CreateMonitorInput (name, type, url required).
 * Returns the newly created monitor with its assigned ID.
 */
export const POST = withAuth(async (request, user) => {
  const client = getKumaClient();
  if (!client) {
    return apiError(
      "BAD_REQUEST",
      "Uptime Kuma is not configured. Set KUMA_URL, KUMA_USERNAME, and KUMA_PASSWORD.",
      503
    );
  }

  let body: CreateMonitorInput;
  try {
    body = (await request.json()) as CreateMonitorInput;
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON request body", 400);
  }

  if (!body.name || !body.type || !body.url) {
    return apiError(
      "VALIDATION_ERROR",
      "Missing required fields: name, type, and url are required",
      422
    );
  }

  try {
    const monitor = await client.createMonitor(body);

    await logAudit({
      actorId: user.id,
      action: "kuma.monitor.create",
      targetType: "kuma_monitor",
      targetId: String(monitor.id),
      diff: { name: body.name, type: body.type, url: body.url },
      request,
    });

    return apiSuccess(monitor, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", `Failed to create monitor: ${message}`, 502);
  }
});

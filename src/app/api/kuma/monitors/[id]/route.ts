/**
 * Kuma monitor detail API proxy — get, delete, pause, and resume a monitor.
 *
 * All Uptime Kuma API calls are proxied through DockYard to enforce
 * authentication and audit logging. The frontend never calls
 * the Kuma API directly.
 *
 * GET    /api/kuma/monitors/:id — Get monitor details
 * DELETE /api/kuma/monitors/:id — Delete a monitor
 * PUT    /api/kuma/monitors/:id — Pause or resume a monitor (action in body)
 */

import { withAuthContext } from "@/lib/auth/guards";
import { getKumaClient } from "@/lib/kuma/client";
import { apiError, apiSuccess } from "@/lib/api/response";
import { logAudit } from "@/lib/auth/audit";

/**
 * GET /api/kuma/monitors/:id — Get a single monitor by ID.
 *
 * Returns the monitor's current status, configuration, and uptime data.
 */
export const GET = withAuthContext(async (_request, _user, context) => {
  const { id } = await context.params;
  const monitorId = parseInt(id, 10);

  if (isNaN(monitorId)) {
    return apiError("BAD_REQUEST", "Monitor ID must be a number", 400);
  }

  const client = getKumaClient();
  if (!client) {
    return apiError(
      "BAD_REQUEST",
      "Uptime Kuma is not configured. Set KUMA_URL, KUMA_USERNAME, and KUMA_PASSWORD.",
      503
    );
  }

  try {
    const monitor = await client.getMonitor(monitorId);
    return apiSuccess(monitor);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("404")) {
      return apiError("NOT_FOUND", `Monitor ${monitorId} not found`, 404);
    }
    return apiError("INTERNAL_ERROR", `Failed to fetch monitor: ${message}`, 502);
  }
});

/**
 * DELETE /api/kuma/monitors/:id — Delete a monitor from Uptime Kuma.
 *
 * Permanently removes the monitor and all its heartbeat history.
 */
export const DELETE = withAuthContext(async (request, user, context) => {
  const { id } = await context.params;
  const monitorId = parseInt(id, 10);

  if (isNaN(monitorId)) {
    return apiError("BAD_REQUEST", "Monitor ID must be a number", 400);
  }

  const client = getKumaClient();
  if (!client) {
    return apiError(
      "BAD_REQUEST",
      "Uptime Kuma is not configured. Set KUMA_URL, KUMA_USERNAME, and KUMA_PASSWORD.",
      503
    );
  }

  try {
    await client.deleteMonitor(monitorId);

    await logAudit({
      actorId: user.id,
      action: "kuma.monitor.delete",
      targetType: "kuma_monitor",
      targetId: id,
      diff: {},
      request,
    });

    return apiSuccess({ deleted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("404")) {
      return apiError("NOT_FOUND", `Monitor ${monitorId} not found`, 404);
    }
    return apiError("INTERNAL_ERROR", `Failed to delete monitor: ${message}`, 502);
  }
});

/**
 * PUT /api/kuma/monitors/:id — Pause or resume a monitor.
 *
 * Request body must include `{ action: "pause" | "resume" }`.
 * Pausing stops health checks without deleting the monitor.
 * Resuming restarts health checks.
 */
export const PUT = withAuthContext(async (request, user, context) => {
  const { id } = await context.params;
  const monitorId = parseInt(id, 10);

  if (isNaN(monitorId)) {
    return apiError("BAD_REQUEST", "Monitor ID must be a number", 400);
  }

  const client = getKumaClient();
  if (!client) {
    return apiError(
      "BAD_REQUEST",
      "Uptime Kuma is not configured. Set KUMA_URL, KUMA_USERNAME, and KUMA_PASSWORD.",
      503
    );
  }

  let body: { action?: string };
  try {
    body = (await request.json()) as { action?: string };
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON request body", 400);
  }

  const { action } = body;

  if (action !== "pause" && action !== "resume") {
    return apiError(
      "VALIDATION_ERROR",
      'Invalid action. Must be "pause" or "resume".',
      422
    );
  }

  try {
    if (action === "pause") {
      await client.pauseMonitor(monitorId);
    } else {
      await client.resumeMonitor(monitorId);
    }

    await logAudit({
      actorId: user.id,
      action: `kuma.monitor.${action}`,
      targetType: "kuma_monitor",
      targetId: id,
      diff: { action },
      request,
    });

    return apiSuccess({ [action === "pause" ? "paused" : "resumed"]: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("404")) {
      return apiError("NOT_FOUND", `Monitor ${monitorId} not found`, 404);
    }
    return apiError(
      "INTERNAL_ERROR",
      `Failed to ${action} monitor: ${message}`,
      502
    );
  }
});

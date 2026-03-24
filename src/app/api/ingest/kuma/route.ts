/**
 * POST /api/ingest/kuma — Uptime Kuma webhook receiver.
 *
 * Accepts incoming webhook notifications from Uptime Kuma when a
 * monitor's status changes (up/down/pending/maintenance). Validates
 * the shared secret from the `KUMA_WEBHOOK_SECRET` environment
 * variable, normalizes the payload into a DockYard signal event,
 * triggers alert evaluation, and broadcasts the status change via SSE.
 *
 * Rate limited: 100 requests per minute per IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { signalEvents, kumaMonitors, projects } from "@/db/schema";
import {
  normalizeKumaWebhook,
  extractProjectSlug,
  type KumaWebhookPayload,
} from "@/lib/kuma/normalizer";
import { inngest } from "@/inngest/client";
import { rateLimit } from "@/lib/auth/rate-limit";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("api.ingest.kuma");

/** POST /api/ingest/kuma — Kuma webhook receiver (rate limited: 100/min). */
export async function POST(request: NextRequest) {
  // Rate limit: 100 Kuma webhook requests per minute per IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const rl = rateLimit(`${ip}:/api/ingest/kuma`, 100, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  // Validate webhook secret (KUMA-031)
  const webhookSecret = process.env.KUMA_WEBHOOK_SECRET;
  if (webhookSecret) {
    const authHeader = request.headers.get("authorization");
    const providedSecret =
      authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : request.headers.get("x-kuma-secret");

    if (!providedSecret || providedSecret !== webhookSecret) {
      log.warn({ ip }, "Kuma webhook rejected — invalid or missing secret");
      return NextResponse.json(
        { error: "Invalid webhook secret" },
        { status: 401 }
      );
    }
  }

  // Parse the payload
  let body: KumaWebhookPayload;
  try {
    body = (await request.json()) as KumaWebhookPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  // Normalize the Kuma payload into DockYard format (KUMA-027)
  const normalized = normalizeKumaWebhook(body);
  if (!normalized) {
    return NextResponse.json(
      { accepted: false, reason: "Invalid or unrecognized payload" },
      { status: 400 }
    );
  }

  // Resolve the project ID from monitor mapping or tags
  let projectId: string | null = null;

  // First, try to find the project via the kuma_monitors table mapping
  const monitorMapping = await db.query.kumaMonitors.findFirst({
    where: eq(kumaMonitors.kumaMonitorId, normalized.monitorId),
  });

  if (monitorMapping) {
    projectId = monitorMapping.projectId;

    // Update the monitor's status in our table
    const statusLabel = normalized.rawPayload.status as string;
    await db
      .update(kumaMonitors)
      .set({
        status: statusLabel,
        updatedAt: new Date(),
      })
      .where(eq(kumaMonitors.id, monitorMapping.id));
  }

  // If no mapping found, try to resolve via tags
  if (!projectId) {
    const slug = extractProjectSlug(body);
    if (slug) {
      const project = await db.query.projects.findFirst({
        where: eq(projects.slug, slug),
      });
      projectId = project?.id ?? null;
    }
  }

  if (!projectId) {
    log.info(
      { monitorId: normalized.monitorId, monitorName: normalized.monitorName },
      "Kuma webhook received but no matching project found"
    );
    return NextResponse.json({
      accepted: false,
      reason: "No matching project found for monitor",
    });
  }

  // Store signal event
  const [event] = await db
    .insert(signalEvents)
    .values({
      projectId,
      source: normalized.source,
      eventType: normalized.eventType,
      rawPayload: normalized.rawPayload,
    })
    .returning();

  log.info(
    {
      eventId: event.id,
      projectId,
      monitorId: normalized.monitorId,
      eventType: normalized.eventType,
    },
    "Kuma webhook processed"
  );

  // Trigger alert evaluation for status changes (KUMA-029)
  if (
    normalized.eventType === "cc.dockyard.kuma.monitor.down" ||
    normalized.eventType === "cc.dockyard.kuma.monitor.up"
  ) {
    await inngest.send({
      name: "dockyard/health.status.changed",
      data: {
        projectId,
        source: "kuma",
        monitorId: normalized.monitorId,
        status: normalized.rawPayload.status,
      },
    });
  }

  // Broadcast status change via SSE (KUMA-030)
  await broadcastKumaStatus(projectId, normalized);

  return NextResponse.json(
    { accepted: true, eventId: event.id, projectId },
    { status: 202 }
  );
}

/**
 * Broadcast a Kuma status change to all connected SSE clients.
 * Fire-and-forget — errors are logged but never thrown.
 */
async function broadcastKumaStatus(
  projectId: string,
  normalized: {
    monitorId: number;
    monitorName: string;
    eventType: string;
    rawPayload: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const broadcastUrl =
      process.env.AUTH_URL ?? "http://localhost:3000";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const secret = process.env.SSE_BROADCAST_SECRET;
    if (secret) {
      headers["Authorization"] = `Bearer ${secret}`;
    }

    await fetch(`${broadcastUrl}/api/sse/broadcast`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        event: "kuma.status.changed",
        data: {
          projectId,
          monitorId: normalized.monitorId,
          monitorName: normalized.monitorName,
          status: normalized.rawPayload.status,
          ping: normalized.rawPayload.ping,
          message: normalized.rawPayload.message,
          timestamp: normalized.rawPayload.time,
        },
      }),
    });

    log.debug(
      { projectId, monitorId: normalized.monitorId },
      "SSE broadcast sent for Kuma status change"
    );
  } catch (err) {
    log.error({ err, projectId }, "Failed to broadcast Kuma status via SSE");
  }
}

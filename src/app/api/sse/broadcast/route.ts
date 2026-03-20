/**
 * POST /api/sse/broadcast — Internal endpoint for triggering SSE broadcasts.
 *
 * Called by Inngest background functions (via notifySSE helper) to push
 * real-time events to connected dashboard clients.
 *
 * Only accepts requests from the same host (localhost / internal network).
 */

import { NextRequest, NextResponse } from "next/server";
import { broadcast, getClientCount } from "@/lib/sse/emitter";

export async function POST(request: NextRequest) {
  // Guard: only accept requests from localhost or with a valid internal secret
  const internalSecret = process.env.SSE_BROADCAST_SECRET;
  const authHeader = request.headers.get("authorization");
  const isLocalhost =
    request.headers.get("host")?.startsWith("localhost") ||
    request.headers.get("host")?.startsWith("127.0.0.1");

  if (!isLocalhost) {
    if (!internalSecret || authHeader !== `Bearer ${internalSecret}`) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json();
  const { event, data } = body as { event?: string; data?: unknown };

  if (!event || typeof event !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'event' field" },
      { status: 400 }
    );
  }

  broadcast(event, data);

  return NextResponse.json({
    ok: true,
    clients: getClientCount(),
  });
}

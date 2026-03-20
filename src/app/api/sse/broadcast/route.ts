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

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/auth/rate-limit";

/**
 * CloudEvents webhook receiver.
 * Accepts incoming events from external sources (GitHub, Dokploy, projects).
 * Validates signatures, normalizes to Signal_Event, queues for background processing.
 * Rate limited: 100 requests per minute per IP.
 * Implementation pending: Phase 1 ingestion tasks.
 */
export function POST(request: NextRequest) {
  // Rate limit: 100 webhook ingestion requests per minute per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
  const rl = rateLimit(`${ip}:/api/ingest`, 100, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  return NextResponse.json(
    { message: "Ingest endpoint — not yet implemented" },
    { status: 501 }
  );
}

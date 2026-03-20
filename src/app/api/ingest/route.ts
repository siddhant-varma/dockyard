import { NextResponse } from "next/server";

/**
 * CloudEvents webhook receiver.
 * Accepts incoming events from external sources (GitHub, Dokploy, projects).
 * Validates signatures, normalizes to Signal_Event, queues for background processing.
 * Implementation pending: Phase 1 ingestion tasks.
 */
export function POST() {
  return NextResponse.json(
    { message: "Ingest endpoint — not yet implemented" },
    { status: 501 }
  );
}

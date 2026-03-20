import { NextResponse } from "next/server";

/**
 * Hetzner Cloud API proxy.
 * Server metrics, billing, and resource management proxied through DockYard.
 * Implementation pending: Phase 1.
 */
export function GET() {
  return NextResponse.json(
    { message: "Hetzner proxy — not yet implemented" },
    { status: 501 }
  );
}

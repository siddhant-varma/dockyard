import { NextResponse } from "next/server";

/**
 * Dokploy API proxy.
 * All Dokploy API calls are proxied through DockYard to enforce auth and audit logging.
 * Implementation pending: Phase 1.
 */
export function GET() {
  return NextResponse.json(
    { message: "Dokploy proxy — not yet implemented" },
    { status: 501 }
  );
}

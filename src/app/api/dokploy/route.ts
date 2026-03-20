import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/guards";

/**
 * Dokploy API proxy.
 * All Dokploy API calls are proxied through DockYard to enforce auth and audit logging.
 * Implementation pending: Phase 2.
 */
export const GET = withAuth(async () => {
  return NextResponse.json(
    { message: "Dokploy proxy — not yet implemented" },
    { status: 501 }
  );
});

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/guards";

/**
 * Config management endpoint.
 * GET/POST: Read and update project configuration entries.
 * Implementation pending: Phase 2.
 */
export const GET = withAuth(async () => {
  return NextResponse.json(
    { message: "Config endpoint — not yet implemented" },
    { status: 501 }
  );
});

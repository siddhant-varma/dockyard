import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/guards";

/**
 * Test suite management endpoint.
 * GET: List test configs/results. POST: Trigger test run.
 * Implementation pending: Phase 2.
 */
export const GET = withAuth(async () => {
  return NextResponse.json(
    { message: "Tests endpoint — not yet implemented" },
    { status: 501 }
  );
});

import { NextResponse } from "next/server";

/**
 * Test suite management endpoint.
 * GET: List test configs/results. POST: Trigger test run.
 * Implementation pending: Phase 1.
 */
export function GET() {
  return NextResponse.json(
    { message: "Tests endpoint — not yet implemented" },
    { status: 501 }
  );
}

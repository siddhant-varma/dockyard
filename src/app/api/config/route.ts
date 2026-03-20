import { NextResponse } from "next/server";

/**
 * Config management endpoint.
 * GET/POST: Read and update project configuration entries.
 * Implementation pending: Phase 1.
 */
export function GET() {
  return NextResponse.json(
    { message: "Config endpoint — not yet implemented" },
    { status: 501 }
  );
}

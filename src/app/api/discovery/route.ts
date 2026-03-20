import { NextResponse } from "next/server";
import { registerAllSources } from "@/lib/discovery/register";
import { scanAll } from "@/lib/discovery/scanner";

// Register all discovery sources
registerAllSources();

/**
 * GET /api/discovery
 * Triggers a full project discovery scan across all enabled sources.
 * Returns the scan results including found/created/updated counts.
 */
export async function GET() {
  try {
    const result = await scanAll();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

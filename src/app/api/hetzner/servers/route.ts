import { NextResponse } from "next/server";
import { HetznerClient } from "@/lib/hetzner/client";

/** GET /api/hetzner/servers — List all Hetzner servers. */
export async function GET() {
  const token = process.env.HETZNER_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Hetzner API not configured" },
      { status: 503 }
    );
  }
  const client = new HetznerClient(token);
  const servers = await client.listServers();
  return NextResponse.json(servers);
}

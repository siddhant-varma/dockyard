import { NextResponse } from "next/server";
import { HetznerClient } from "@/lib/hetzner/client";

/** GET /api/hetzner/status — Server status card data. */
export async function GET() {
  const token = process.env.HETZNER_API_TOKEN;
  const serverId = process.env.HETZNER_SERVER_ID;
  if (!token || !serverId) {
    return NextResponse.json(
      { error: "Hetzner API not configured" },
      { status: 503 }
    );
  }
  const client = new HetznerClient(token);
  const server = await client.getServer(serverId);
  return NextResponse.json(server);
}

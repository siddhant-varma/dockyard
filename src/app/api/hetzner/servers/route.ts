import { NextResponse } from "next/server";
import { HetznerClient } from "@/lib/hetzner/client";
import { withAuth } from "@/lib/auth/guards";

/** GET /api/hetzner/servers — List all Hetzner servers. */
export const GET = withAuth(async () => {
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
});

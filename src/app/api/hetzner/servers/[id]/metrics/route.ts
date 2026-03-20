import { NextRequest, NextResponse } from "next/server";
import { HetznerClient } from "@/lib/hetzner/client";
import type { ServerMetricType } from "@/lib/providers/types";

type Params = Promise<{ id: string }>;

/** GET /api/hetzner/servers/:id/metrics — Server metrics time series. */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { id } = await params;
  const token = process.env.HETZNER_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Hetzner API not configured" },
      { status: 503 }
    );
  }

  const sp = request.nextUrl.searchParams;
  const type = (sp.get("type") ?? "cpu") as ServerMetricType;
  const startParam = sp.get("start");
  const endParam = sp.get("end");
  const start = startParam
    ? new Date(startParam)
    : new Date(Date.now() - 3600000);
  const end = endParam ? new Date(endParam) : new Date();
  const step = sp.get("step") ? Number(sp.get("step")) : 60;

  const client = new HetznerClient(token);
  const metrics = await client.getServerMetrics(id, type, { start, end, step });
  return NextResponse.json(metrics);
}

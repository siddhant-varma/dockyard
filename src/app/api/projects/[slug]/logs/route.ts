import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { projects } from "@/db/schema";
import { DokployClient } from "@/lib/dokploy/client";

type Params = Promise<{ slug: string }>;

/** GET /api/projects/:slug/logs — Fetch logs from Dokploy. */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { slug } = await params;
  const sp = request.nextUrl.searchParams;
  const tail = Number(sp.get("tail") ?? 100);

  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, slug),
  });
  if (!project?.dokployAppId) {
    return NextResponse.json(
      { error: "Project not linked to Dokploy" },
      { status: 400 }
    );
  }

  const apiUrl = process.env.DOKPLOY_API_URL;
  const apiKey = process.env.DOKPLOY_API_KEY;
  if (!apiUrl || !apiKey) {
    return NextResponse.json(
      { error: "Dokploy not configured" },
      { status: 503 }
    );
  }

  const client = new DokployClient(apiUrl, apiKey);
  const logs = await client.getLogs(project.dokployAppId, { tail });

  // Optional severity filtering
  const level = sp.get("level");
  const filtered = level ? logs.filter((l) => l.level === level) : logs;

  return NextResponse.json(filtered);
}

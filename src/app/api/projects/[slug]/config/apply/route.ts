import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { projects, deploymentEvents } from "@/db/schema";
import { buildEnvString } from "@/lib/config/service";
import { DokployClient } from "@/lib/dokploy/client";
import { inngest } from "@/inngest/client";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/auth/rate-limit";

type Params = Promise<{ slug: string }>;

/** POST /api/projects/:slug/config/apply — Apply config + redeploy via Dokploy (rate limited: 5/min). */
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Rate limit: 5 config-apply requests per minute per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
  const rl = rateLimit(`${ip}:/api/projects/config/apply`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

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
  const envString = await buildEnvString(project.id);

  // Save environment to Dokploy
  await client.saveEnvironment(project.dokployAppId, envString);

  // Trigger redeploy
  const deployResult = await client.redeploy(project.dokployAppId);

  // Create deployment event for tracking
  const [deployEvent] = await db
    .insert(deploymentEvents)
    .values({
      projectId: project.id,
      status: "deploying",
      triggeredBy: `user:${session.user.id}`,
      dokployDeployId: deployResult.deployId,
    })
    .returning();

  // Emit event for deploy tracker to poll status
  await inngest.send({
    name: "dockyard/deploy.triggered",
    data: {
      deployEventId: deployEvent.id,
      dokployAppId: project.dokployAppId,
      projectId: project.id,
    },
  });

  return NextResponse.json({
    deployEventId: deployEvent.id,
    status: "deploying",
  });
}

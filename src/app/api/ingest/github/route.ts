import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { projects, signalEvents } from "@/db/schema";
import {
  verifyGitHubSignature,
  normalizeGitHubEvent,
} from "@/lib/ingestion/github";
import { inngest } from "@/inngest/client";

/** POST /api/ingest/github — GitHub webhook receiver. */
export async function POST(request: NextRequest) {
  const eventType = request.headers.get("x-github-event");
  const signature = request.headers.get("x-hub-signature-256");

  if (!eventType) {
    return NextResponse.json(
      { error: "Missing X-GitHub-Event header" },
      { status: 400 }
    );
  }

  const rawBody = await request.text();

  // Verify signature if webhook secret is configured
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (secret) {
    if (!signature) {
      return NextResponse.json(
        { error: "Missing X-Hub-Signature-256 header" },
        { status: 401 }
      );
    }
    if (!verifyGitHubSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const body = JSON.parse(rawBody) as Record<string, unknown>;
  const normalized = normalizeGitHubEvent(eventType, body);

  if (!normalized) {
    return NextResponse.json({
      accepted: false,
      reason: "Unsupported event type",
    });
  }

  // Resolve project by repo slug
  let projectId: string | null = null;
  if (normalized.projectSlug) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, normalized.projectSlug),
    });
    projectId = project?.id ?? null;
  }

  if (!projectId) {
    return NextResponse.json({ accepted: false, reason: "Project not found" });
  }

  // Store signal event
  const [event] = await db
    .insert(signalEvents)
    .values({
      projectId,
      source: normalized.source,
      eventType: normalized.eventType,
      rawPayload: normalized.rawPayload,
    })
    .returning();

  // Emit for background processing
  await inngest.send({
    name: "dockyard/signal.received",
    data: { eventId: event.id },
  });

  return NextResponse.json(
    { accepted: true, eventId: event.id },
    { status: 202 }
  );
}

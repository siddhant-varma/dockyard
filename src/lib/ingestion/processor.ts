/**
 * Signal event processor.
 *
 * Routes incoming signal events to the appropriate handler based on
 * source and event type. Updates project metadata (last activity,
 * deploy history) and marks events as processed.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { signalEvents, projects, deploymentEvents } from "@/db/schema";
import { createModuleLogger } from "@/lib/logger";
const log = createModuleLogger("ingestion.processor");

/** Result of processing a signal event. */
export interface ProcessResult {
  eventId: string;
  processed: boolean;
  action?: string;
  error?: string;
}

/**
 * Process a single signal event by routing to the appropriate handler.
 */
export async function processSignalEvent(
  eventId: string
): Promise<ProcessResult> {
  const event = await db.query.signalEvents.findFirst({
    where: eq(signalEvents.id, eventId),
  });

  if (!event) {
    return { eventId, processed: false, error: "Event not found" };
  }

  if (event.processed) {
    return { eventId, processed: true, action: "already_processed" };
  }

  try {
    const action = await routeEvent(event);

    // Mark as processed
    await db
      .update(signalEvents)
      .set({ processed: true })
      .where(eq(signalEvents.id, eventId));

    // Update project last activity
    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, event.projectId));

    log.info(
      { eventId, action, source: event.source, eventType: event.eventType },
      "Signal event processed"
    );

    return { eventId, processed: true, action };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(
      { eventId, err, source: event.source, eventType: event.eventType },
      "Signal event processing failed"
    );
    return { eventId, processed: false, error: message };
  }
}

/**
 * Route an event to the appropriate handler based on type.
 */
async function routeEvent(event: {
  projectId: string;
  source: string;
  eventType: string;
  rawPayload: unknown;
}): Promise<string> {
  const payload = event.rawPayload as Record<string, unknown>;

  // GitHub events
  if (event.eventType.startsWith("cc.dockyard.github.")) {
    return handleGitHubEvent(event.projectId, event.eventType, payload);
  }

  // Deploy events
  if (event.eventType.includes("deployment")) {
    return handleDeployEvent(event.projectId, payload);
  }

  return "stored";
}

async function handleGitHubEvent(
  projectId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<string> {
  if (eventType === "cc.dockyard.github.push") {
    const commitCount = payload.commitCount as number | undefined;
    return `github_push: ${commitCount ?? 0} commits`;
  }

  if (eventType === "cc.dockyard.github.release") {
    return `github_release: ${payload.tagName}`;
  }

  return `github_event: ${eventType}`;
}

async function handleDeployEvent(
  projectId: string,
  payload: Record<string, unknown>
): Promise<string> {
  const status = (payload.status as string) ?? "pending";
  const commitSha = payload.commit_sha as string | undefined;

  await db.insert(deploymentEvents).values({
    projectId,
    version: payload.version as string | undefined,
    commitSha,
    commitMessage: payload.commit_message as string | undefined,
    status: status as
      | "pending"
      | "building"
      | "deploying"
      | "success"
      | "failed"
      | "rolled_back",
    triggeredBy: payload.triggered_by as string | undefined,
  });

  return `deploy_event: ${status}`;
}

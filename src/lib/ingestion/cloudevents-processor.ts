/**
 * CloudEvents routing and processing engine.
 *
 * Routes validated CloudEvents to the appropriate handler based on
 * event type. Each handler updates the relevant database tables:
 *
 * - deployment.started/completed/failed -> deployment_events table
 * - error.spike -> creates alert via alert_events table
 * - config.changed -> logs to audit_logs table
 *
 * This processor sits between the ingestion endpoint and the domain
 * services, acting as a dispatcher that normalizes and routes events.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import {
  deploymentEvents,
  alertEvents,
  alertRules,
  auditLogs,
  projects,
} from "@/db/schema";
import type { CloudEvent } from "./cloudevents";

/** Result of processing a single CloudEvent. */
export interface ProcessingResult {
  /** The event ID that was processed. */
  eventId: string;
  /** The event type that was processed. */
  eventType: string;
  /** Whether processing succeeded. */
  success: boolean;
  /** What action was taken (e.g., "deployment_updated", "alert_created"). */
  action: string;
  /** Error message if processing failed. */
  error?: string;
}

/** Event type prefixes that this processor handles. */
const DEPLOYMENT_TYPES = [
  "cc.dockyard.deployment.started",
  "cc.dockyard.deployment.completed",
  "cc.dockyard.deployment.failed",
] as const;

const ERROR_TYPES = ["cc.dockyard.error.spike"] as const;

const CONFIG_TYPES = ["cc.dockyard.config.changed"] as const;

/**
 * Process a validated CloudEvent by routing it to the appropriate handler.
 *
 * Routes by event type prefix:
 * - `cc.dockyard.deployment.*` -> deployment event handler
 * - `cc.dockyard.error.*` -> alert creation handler
 * - `cc.dockyard.config.*` -> audit log handler
 *
 * Unrecognized event types are stored but not actively processed.
 *
 * @param event - A validated CloudEvent (output of parseCloudEvent)
 * @returns Processing result describing what action was taken
 */
export async function processCloudEvent(
  event: CloudEvent
): Promise<ProcessingResult> {
  try {
    if (isDeploymentEvent(event.type)) {
      return handleDeploymentEvent(event);
    }

    if (isErrorEvent(event.type)) {
      return handleErrorSpikeEvent(event);
    }

    if (isConfigEvent(event.type)) {
      return handleConfigChangedEvent(event);
    }

    return {
      eventId: event.id,
      eventType: event.type,
      success: true,
      action: "unhandled_type_stored",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      eventId: event.id,
      eventType: event.type,
      success: false,
      action: "error",
      error: message,
    };
  }
}

/**
 * Handle deployment lifecycle events (started, completed, failed).
 *
 * Maps the CloudEvent type to a deploy status and upserts into
 * the deployment_events table. The event subject is used as the
 * project slug to resolve the project ID.
 */
async function handleDeploymentEvent(
  event: CloudEvent
): Promise<ProcessingResult> {
  const data = (event.data ?? {}) as Record<string, unknown>;
  const projectId = await resolveProjectId(event.subject, data);

  if (!projectId) {
    return {
      eventId: event.id,
      eventType: event.type,
      success: false,
      action: "deployment_skipped",
      error: "Could not resolve project ID from event subject or data",
    };
  }

  const statusMap: Record<string, string> = {
    "cc.dockyard.deployment.started": "building",
    "cc.dockyard.deployment.completed": "success",
    "cc.dockyard.deployment.failed": "failed",
  };

  const status = statusMap[event.type] ?? "pending";

  await db.insert(deploymentEvents).values({
    projectId,
    version: typeof data.version === "string" ? data.version : undefined,
    commitSha: typeof data.commitSha === "string" ? data.commitSha : undefined,
    commitMessage:
      typeof data.commitMessage === "string" ? data.commitMessage : undefined,
    environment:
      typeof data.environment === "string" ? data.environment : "production",
    status: status as
      | "pending"
      | "building"
      | "deploying"
      | "success"
      | "failed"
      | "rolled_back",
    triggeredBy:
      typeof data.triggeredBy === "string" ? data.triggeredBy : event.source,
    deployedAt: new Date(event.time),
    completedAt: status === "success" || status === "failed" ? new Date() : undefined,
  });

  return {
    eventId: event.id,
    eventType: event.type,
    success: true,
    action: `deployment_${status}`,
  };
}

/**
 * Handle error spike events by creating an alert.
 *
 * Looks up a matching alert rule or creates a generic sev3 alert
 * for the project. Error spike events indicate a sudden increase
 * in error rates detected by the project's monitoring.
 */
async function handleErrorSpikeEvent(
  event: CloudEvent
): Promise<ProcessingResult> {
  const data = (event.data ?? {}) as Record<string, unknown>;
  const projectId = await resolveProjectId(event.subject, data);

  if (!projectId) {
    return {
      eventId: event.id,
      eventType: event.type,
      success: false,
      action: "alert_skipped",
      error: "Could not resolve project ID from event subject or data",
    };
  }

  // Find a matching error spike alert rule, or use a default
  const matchingRule = await db.query.alertRules.findFirst({
    where: eq(alertRules.metric, "error_rate"),
  });

  const severity =
    typeof data.severity === "string" &&
    ["sev1", "sev2", "sev3", "sev4"].includes(data.severity)
      ? (data.severity as "sev1" | "sev2" | "sev3" | "sev4")
      : "sev3";

  const errorMessage =
    typeof data.message === "string"
      ? data.message
      : `Error spike detected from ${event.source}`;

  if (matchingRule) {
    await db.insert(alertEvents).values({
      ruleId: matchingRule.id,
      projectId,
      severity,
      status: "firing",
      message: errorMessage,
      context: {
        cloudEventId: event.id,
        source: event.source,
        errorCount: data.errorCount,
        timeWindow: data.timeWindow,
      },
    });
  }

  return {
    eventId: event.id,
    eventType: event.type,
    success: true,
    action: matchingRule ? "alert_created" : "alert_skipped_no_rule",
  };
}

/**
 * Handle config change events by logging to the audit trail.
 *
 * Records the change in the append-only audit_logs table for
 * compliance and debugging purposes.
 */
async function handleConfigChangedEvent(
  event: CloudEvent
): Promise<ProcessingResult> {
  const data = (event.data ?? {}) as Record<string, unknown>;

  await db.insert(auditLogs).values({
    action: "config.changed",
    targetType: "config_entry",
    targetId: typeof data.key === "string" ? data.key : event.subject ?? "unknown",
    diff: {
      cloudEventId: event.id,
      source: event.source,
      changedAt: event.time,
      key: data.key,
      environment: data.environment,
      changedBy: data.changedBy,
    },
    timestamp: new Date(event.time),
  });

  return {
    eventId: event.id,
    eventType: event.type,
    success: true,
    action: "audit_logged",
  };
}

/**
 * Resolve a project UUID from an event subject (slug) or data payload.
 *
 * @param subject - CloudEvent subject field (typically the project slug)
 * @param data - Event data payload (may contain projectId or projectSlug)
 * @returns Project UUID or null if not found
 */
async function resolveProjectId(
  subject: string | undefined,
  data: Record<string, unknown>
): Promise<string | null> {
  // Direct project ID in data
  if (typeof data.projectId === "string") {
    return data.projectId;
  }

  // Resolve from slug (subject or data.projectSlug)
  const slug =
    subject ??
    (typeof data.projectSlug === "string" ? data.projectSlug : null);
  if (!slug) return null;

  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, slug),
  });

  return project?.id ?? null;
}

function isDeploymentEvent(type: string): boolean {
  return DEPLOYMENT_TYPES.some((t) => type === t);
}

function isErrorEvent(type: string): boolean {
  return ERROR_TYPES.some((t) => type === t);
}

function isConfigEvent(type: string): boolean {
  return CONFIG_TYPES.some((t) => type === t);
}

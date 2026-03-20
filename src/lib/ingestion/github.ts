/**
 * GitHub webhook ingestion normalizer.
 *
 * Validates incoming GitHub webhook signatures (HMAC-SHA256) and
 * normalizes push, pull_request, issues, and release events into
 * the DockYard Signal_Event schema.
 */

import { createHmac, timingSafeEqual } from "crypto";

/** Normalized signal event ready for storage. */
export interface NormalizedSignalEvent {
  source: "github";
  eventType: string;
  projectSlug: string | null;
  rawPayload: Record<string, unknown>;
}

/** GitHub event types we process. */
const SUPPORTED_EVENTS = [
  "push",
  "pull_request",
  "issues",
  "release",
  "deployment_status",
  "workflow_run",
] as const;

/**
 * Validate a GitHub webhook signature.
 *
 * @param payload - Raw request body as string
 * @param signature - Value of X-Hub-Signature-256 header
 * @param secret - Webhook secret configured in GitHub
 * @returns true if signature is valid
 */
export function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  const sig = signature.slice(7); // Remove "sha256=" prefix
  try {
    return timingSafeEqual(
      Buffer.from(sig, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Normalize a GitHub webhook event into a DockYard signal event.
 *
 * @param eventType - Value of X-GitHub-Event header
 * @param body - Parsed JSON body
 * @returns Normalized event or null if event type is not supported
 */
export function normalizeGitHubEvent(
  eventType: string,
  body: Record<string, unknown>
): NormalizedSignalEvent | null {
  if (
    !SUPPORTED_EVENTS.includes(eventType as (typeof SUPPORTED_EVENTS)[number])
  ) {
    return null;
  }

  const repo = body.repository as Record<string, unknown> | undefined;
  const repoFullName =
    typeof repo?.full_name === "string" ? repo.full_name : null;
  // Derive slug from repo name: "example-org/my-project" → "my-project"
  const projectSlug = repoFullName?.split("/").pop() ?? null;

  const mapped = `cc.dockyard.github.${eventType}`;

  return {
    source: "github",
    eventType: mapped,
    projectSlug,
    rawPayload: {
      githubEventType: eventType,
      repository: repoFullName,
      ...extractEventSummary(eventType, body),
    },
  };
}

/** Extract a concise summary from different GitHub event types. */
function extractEventSummary(
  eventType: string,
  body: Record<string, unknown>
): Record<string, unknown> {
  switch (eventType) {
    case "push": {
      const commits = body.commits as
        | Array<Record<string, unknown>>
        | undefined;
      return {
        ref: body.ref,
        commitCount: commits?.length ?? 0,
        headCommit: body.head_commit
          ? {
              message: (body.head_commit as Record<string, unknown>).message,
              sha: (body.head_commit as Record<string, unknown>).id,
            }
          : null,
        pusher: (body.pusher as Record<string, unknown>)?.name,
      };
    }
    case "pull_request": {
      const pr = body.pull_request as Record<string, unknown> | undefined;
      return {
        action: body.action,
        prNumber: pr?.number,
        prTitle: pr?.title,
        prState: pr?.state,
      };
    }
    case "issues": {
      const issue = body.issue as Record<string, unknown> | undefined;
      return {
        action: body.action,
        issueNumber: issue?.number,
        issueTitle: issue?.title,
      };
    }
    case "release": {
      const release = body.release as Record<string, unknown> | undefined;
      return {
        action: body.action,
        tagName: release?.tag_name,
        releaseName: release?.name,
        prerelease: release?.prerelease,
      };
    }
    default:
      return { action: body.action };
  }
}

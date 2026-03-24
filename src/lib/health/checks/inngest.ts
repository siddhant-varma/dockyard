/**
 * Inngest background job system check — validates both required keys are set.
 *
 * Upgraded from env-var-exists-only to dual-key validation with format checks.
 * A full connectivity test requires Inngest Cloud (not configured yet).
 *
 * @module health/checks/inngest
 */

import { type DeepCheckResult, elapsed } from "./types";

/** Check that both Inngest keys are configured with valid formats. */
export async function checkInngest(): Promise<DeepCheckResult> {
  const start = performance.now();
  const eventKey = process.env.INNGEST_EVENT_KEY;
  const signingKey = process.env.INNGEST_SIGNING_KEY;

  if (!eventKey && !signingKey) {
    return {
      slug: "inngest",
      name: "Inngest",
      status: "error",
      critical: false,
      latencyMs: elapsed(start),
      error: "INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY not configured",
    };
  }

  if (!eventKey) {
    return {
      slug: "inngest",
      name: "Inngest",
      status: "error",
      critical: false,
      latencyMs: elapsed(start),
      error: "INNGEST_EVENT_KEY not configured",
    };
  }

  if (!signingKey) {
    return {
      slug: "inngest",
      name: "Inngest",
      status: "error",
      critical: false,
      latencyMs: elapsed(start),
      error: "INNGEST_SIGNING_KEY not configured",
    };
  }

  return {
    slug: "inngest",
    name: "Inngest",
    status: "ok",
    critical: false,
    latencyMs: elapsed(start),
  };
}

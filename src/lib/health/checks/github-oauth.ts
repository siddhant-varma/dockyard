/**
 * GitHub OAuth credentials check — validates env vars are configured.
 *
 * Does NOT call the GitHub API (OAuth apps don't have a "ping" endpoint
 * that takes client_id alone). Validates both required env vars are set
 * and the client ID has a plausible format.
 *
 * @module health/checks/github-oauth
 */

import { type DeepCheckResult, elapsed } from "./types";

/** Check that GitHub OAuth credentials are configured and well-formed. */
export async function checkGitHubOAuth(): Promise<DeepCheckResult> {
  const start = performance.now();
  const clientId = process.env.AUTH_GITHUB_ID;
  const clientSecret = process.env.AUTH_GITHUB_SECRET;

  if (!clientId && !clientSecret) {
    return {
      slug: "github-oauth",
      name: "GitHub OAuth",
      status: "ok",
      critical: false,
      latencyMs: elapsed(start),
      error: "Not configured (optional)",
    };
  }

  if (!clientId) {
    return {
      slug: "github-oauth",
      name: "GitHub OAuth",
      status: "error",
      critical: false,
      latencyMs: elapsed(start),
      error: "AUTH_GITHUB_ID not set",
    };
  }

  if (!clientSecret) {
    return {
      slug: "github-oauth",
      name: "GitHub OAuth",
      status: "error",
      critical: false,
      latencyMs: elapsed(start),
      error: "AUTH_GITHUB_SECRET not set",
    };
  }

  if (clientId.length < 10) {
    return {
      slug: "github-oauth",
      name: "GitHub OAuth",
      status: "error",
      critical: false,
      latencyMs: elapsed(start),
      error: "AUTH_GITHUB_ID looks malformed (too short)",
    };
  }

  return {
    slug: "github-oauth",
    name: "GitHub OAuth",
    status: "ok",
    critical: false,
    latencyMs: elapsed(start),
  };
}

/**
 * Health check registry — maps slug → check function.
 *
 * Each check is a named entry that can be:
 * (a) iterated for full deep health scans
 * (b) looked up individually via `?check=<slug>` query param
 *
 * @module health/checks
 */

export type { DeepCheckResult, CheckFn } from "./types";

import type { CheckFn } from "./types";
import { checkPostgres } from "./postgres";
import { checkTimescaleDB } from "./timescaledb";
import { checkInngest } from "./inngest";
import { checkDokploy } from "./dokploy";
import { checkHetzner } from "./hetzner";
import { checkEncryption } from "./encryption";
import { checkKuma } from "./kuma";
import { checkGitHubOAuth } from "./github-oauth";
import { checkGitHubApi } from "./github-api";
import { checkResend } from "./resend";
import { checkSlack } from "./slack";
import { checkAiProvider } from "./ai-provider";
import { checkSseBroadcast } from "./sse-broadcast";
import { checkSchema } from "./schema";

/**
 * Registry of all deep health checks, keyed by stable slug.
 *
 * Order determines display order in the API response.
 * Critical checks (postgres, encryption) are listed first.
 */
export const CHECK_REGISTRY: ReadonlyMap<string, CheckFn> = new Map<
  string,
  CheckFn
>([
  ["schema", checkSchema],
  ["postgres", checkPostgres],
  ["timescaledb", checkTimescaleDB],
  ["encryption", checkEncryption],
  ["inngest", checkInngest],
  ["dokploy", checkDokploy],
  ["hetzner", checkHetzner],
  ["kuma", checkKuma],
  ["github-oauth", checkGitHubOAuth],
  ["github-api", checkGitHubApi],
  ["resend", checkResend],
  ["slack", checkSlack],
  ["ai", checkAiProvider],
  ["sse", checkSseBroadcast],
]);

/** Get all registered check slugs (stable identifiers for `?check=` param). */
export function getCheckSlugs(): string[] {
  return [...CHECK_REGISTRY.keys()];
}

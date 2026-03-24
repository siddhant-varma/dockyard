/**
 * Environment variable validation and typed access.
 *
 * Validates all required env vars at import time using Zod.
 * Fails fast with clear error messages if anything is missing.
 *
 * Import the typed `env` object instead of using `process.env` directly:
 * ```ts
 * import { env } from "@/lib/env";
 * const dbUrl = env.DATABASE_URL;
 * ```
 */

import { z } from "zod";
import { rootLogger } from "@/lib/logger";

const envSchema = z.object({
  // ── Deployment Mode ─────────────────────────────────────────
  /** "local" = filesystem discovery, localhost health checks.
   *  "server" = Dokploy + Hetzner + GitHub integration. */
  DOCKYARD_MODE: z.enum(["local", "server"]).default("local"),

  /** Demo mode — skips all API/DB calls, uses static demo data.
   *  Use when running the frontend without a database or backend. */
  DOCKYARD_DEMO: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  /** Diagnostic mode — attempts real data fetches but catches errors.
   *  Failed fetches render inline error cards instead of crashing.
   *  Allows visual health tracking of which components/APIs are working. */
  DOCKYARD_DIAGNOSTIC: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  // ── Auth Feature Flags ──────────────────────────────────────
  /** Enable login system. When false, all pages are public. */
  DOCKYARD_AUTH_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  /** Enable TOTP-based 2FA on top of login. Requires auth enabled. */
  DOCKYARD_2FA_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  /** Admin credentials for simple auth (when GitHub OAuth is not configured).
   *  Format: username for DOCKYARD_ADMIN_USER, password for DOCKYARD_ADMIN_PASSWORD. */
  DOCKYARD_ADMIN_USER: z.string().default("admin"),
  DOCKYARD_ADMIN_PASSWORD: z.string().optional(),

  // ── Database ────────────────────────────────────────────────
  DATABASE_URL: z
    .string()
    .default("postgresql://dockyard:dockyard@localhost:5433/dockyard"),

  // ── Auth (Auth.js v5) — only needed when DOCKYARD_AUTH_ENABLED=true
  AUTH_SECRET: z.string().optional(),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  AUTH_URL: z.string().optional(),

  // ── GitHub Discovery — org or username to scan repos from
  GITHUB_ORG: z.string().optional(),
  GITHUB_USER: z.string().optional(),

  // ── Dokploy — only needed when DOCKYARD_MODE=server
  DOKPLOY_API_URL: z.string().optional(),
  DOKPLOY_API_KEY: z.string().optional(),

  // ── Hetzner Cloud — only needed when DOCKYARD_MODE=server
  HETZNER_API_TOKEN: z.string().optional(),
  HETZNER_SERVER_ID: z.string().optional(),

  // ── Dokploy App — for log viewer integration
  DOKPLOY_APP_ID: z.string().optional(),

  // ── Encryption
  CONFIG_ENCRYPTION_KEY: z.string().optional(),

  // ── Notifications
  RESEND_API_KEY: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().optional(),

  // ── SSE — required in production for internal broadcast auth
  SSE_BROADCAST_SECRET: z.string().optional(),

  // ── GitHub Webhooks — signature verification
  GITHUB_WEBHOOK_SECRET: z.string().optional(),

  // ── AI Provider
  DOCKYARD_AI_PROVIDER: z.string().optional(),
  DOCKYARD_AI_MODEL: z.string().optional(),
  DOCKYARD_AI_MAX_TOKENS: z.string().optional(),
  DOCKYARD_AI_TEMPERATURE: z.string().optional(),

  // ── Uptime Kuma — external health monitoring integration (optional)
  /** Base URL of the Uptime Kuma instance (e.g., http://localhost:3002). */
  KUMA_URL: z.string().optional(),
  /** API key for Uptime Kuma (preferred, v1.23+). Avoids storing username/password. */
  KUMA_API_KEY: z.string().optional(),
  /** Username for Uptime Kuma login (fallback when API key is not set). */
  KUMA_USERNAME: z.string().optional(),
  /** Password for Uptime Kuma login (fallback when API key is not set). */
  KUMA_PASSWORD: z.string().optional(),
  /** Shared secret for validating incoming Kuma webhook notifications.
   *  When set, the POST /api/ingest/kuma endpoint requires this secret
   *  in the Authorization header (Bearer token) or X-Kuma-Secret header. */
  KUMA_WEBHOOK_SECRET: z.string().optional(),

  // ── Inngest
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  // ── Logging
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .optional(),

  // ── DockYard platform
  DOCKYARD_DOMAIN: z.string().default("dockyard.cc"),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    rootLogger.fatal(
      { issues: result.error.issues },
      `Environment validation failed:\n${formatted}`
    );
    throw new Error("Invalid environment variables");
  }
  return result.data;
}

/**
 * Typed, validated environment variables.
 * Access any env var as a typed property: `env.DATABASE_URL`
 */
export const env = validateEnv();

/** Whether running in server/VPS mode (Dokploy + Hetzner). */
export const isServerMode = env.DOCKYARD_MODE === "server";

/** Whether the login system is active. */
export const isAuthEnabled = env.DOCKYARD_AUTH_ENABLED;

/** Whether 2FA is active (only meaningful when auth is enabled). */
export const is2FAEnabled =
  env.DOCKYARD_AUTH_ENABLED && env.DOCKYARD_2FA_ENABLED;

/** Whether demo mode is active — skips all API/DB calls. */
export const isDemoMode = env.DOCKYARD_DEMO;

/** Whether diagnostic mode is active — attempts real fetches, shows error cards on failure. */
export const isDiagnosticMode = env.DOCKYARD_DIAGNOSTIC;

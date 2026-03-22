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

  // ── Dokploy — only needed when DOCKYARD_MODE=server
  DOKPLOY_API_URL: z.string().optional(),
  DOKPLOY_API_KEY: z.string().optional(),

  // ── Hetzner Cloud — only needed when DOCKYARD_MODE=server
  HETZNER_API_TOKEN: z.string().optional(),
  HETZNER_SERVER_ID: z.string().optional(),

  // ── Encryption
  CONFIG_ENCRYPTION_KEY: z.string().optional(),

  // ── Notifications
  RESEND_API_KEY: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().optional(),

  // ── Inngest
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  // ── DockYard platform
  DOCKYARD_DOMAIN: z.string().default("dockyard.cc"),
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
    console.error(`Environment validation failed:\n${formatted}`);
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
export const is2FAEnabled = env.DOCKYARD_AUTH_ENABLED && env.DOCKYARD_2FA_ENABLED;

/** Whether demo mode is active — skips all API/DB calls. */
export const isDemoMode = env.DOCKYARD_DEMO;

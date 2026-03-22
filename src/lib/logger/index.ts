/**
 * Root Pino logger for DockYard.
 *
 * Provides structured JSON logging with automatic PII redaction,
 * request-scoped context via AsyncLocalStorage, and environment-aware
 * transport selection (pino-pretty in dev, JSON to stdout in production).
 *
 * @example
 * ```ts
 * import { getLogger, createModuleLogger } from "@/lib/logger";
 *
 * // Inside a request (auto-inherits requestId, userId, path):
 * const log = getLogger();
 * log.info({ projectCount: 5 }, "Discovery scan completed");
 *
 * // Module-scoped (outside request context):
 * const log = createModuleLogger("discovery.scanner");
 * log.info("Scanner initialized");
 * ```
 */

import pino from "pino";
import { getStore } from "./context";

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

/**
 * Root Pino logger instance.
 *
 * Configured with:
 * - Level from LOG_LEVEL env var (default: info in prod, debug in dev)
 * - Path-based PII redaction (passwords, tokens, API keys, config values)
 * - ISO timestamps for Loki/ELK compatibility
 * - Human-readable level labels (not numeric codes)
 * - pino-pretty transport in development
 */
export const rootLogger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : isTest ? "warn" : "debug"),

  redact: {
    paths: [
      "password",
      "*.password",
      "*.token",
      "*.apiKey",
      "*.secret",
      "*.accessToken",
      "*.refreshToken",
      "req.headers.authorization",
      "req.headers.cookie",
      'req.headers["x-api-key"]',
      'req.headers["x-dokploy-key"]',
      "config.value",
      "config.value_encrypted",
      "*.value_encrypted",
      "oldValue",
      "newValue",
    ],
    censor: "[REDACTED]",
  },

  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      service: "dockyard",
      env: process.env.NODE_ENV ?? "development",
      pid: bindings.pid,
      hostname: bindings.hostname,
    }),
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  transport: isProduction
    ? undefined // JSON to stdout (default) — Docker/Dokploy captures it
    : isTest
      ? undefined // Suppress pretty-print noise in tests
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname,service,env",
          },
        },
});

/**
 * Get a logger with the current request context (requestId, userId, path).
 * Falls back to the root logger when called outside a request context
 * (e.g., startup, cron jobs before Inngest middleware runs).
 */
export function getLogger(): pino.Logger {
  const store = getStore();
  return store?.logger ?? rootLogger;
}

/**
 * Create a child logger bound to a specific module.
 * Use this at module scope for services that log outside request context.
 *
 * @param moduleName - Dot-separated module path (e.g., "discovery.filesystem")
 */
export function createModuleLogger(moduleName: string): pino.Logger {
  return rootLogger.child({ module: moduleName });
}

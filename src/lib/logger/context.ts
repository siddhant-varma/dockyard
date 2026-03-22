/**
 * AsyncLocalStorage-based request context for DockYard logging.
 *
 * Provides automatic context propagation through the entire async call chain
 * without prop-drilling. Every function that calls `getLogger()` automatically
 * inherits the requestId, userId, and path from the originating API request.
 *
 * @example
 * ```ts
 * // In API route wrapper:
 * runWithContext({ requestId, userId, method, path }, async () => {
 *   // All nested function calls get the context automatically
 *   const result = await scanAll(); // scanAll() calls getLogger() internally
 * });
 * ```
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type pino from "pino";

/** Context stored in AsyncLocalStorage for the duration of a request. */
export interface LogContext {
  /** Unique request identifier for correlating all logs from one request. */
  requestId: string;
  /** Authenticated user ID (set after auth check). */
  userId?: string;
  /** HTTP method (GET, POST, etc.). */
  method?: string;
  /** URL path (no query string — may contain tokens). */
  path?: string;
  /** High-resolution start time for duration calculation. */
  startTime: number;
  /** Child Pino logger with context fields bound. */
  logger: pino.Logger;
}

const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

/**
 * Run a function within a logging context.
 * All calls to `getLogger()` within `fn` will return a logger
 * with the context fields (requestId, userId, etc.) automatically bound.
 */
export function runWithContext<T>(
  context: LogContext,
  fn: () => T
): T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Read the current request context from AsyncLocalStorage.
 * Returns undefined when called outside a request context.
 */
export function getStore(): LogContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Update the current context with additional fields (e.g., userId after auth).
 * No-op when called outside a request context.
 */
export function updateContext(fields: Partial<LogContext>): void {
  const store = asyncLocalStorage.getStore();
  if (store) {
    Object.assign(store, fields);
  }
}

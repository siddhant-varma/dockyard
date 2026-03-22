/**
 * API route logging middleware for DockYard.
 *
 * Wraps API route handlers with automatic request/response logging:
 * - Generates a unique requestId per request
 * - Creates a child Pino logger with request context (method, path, requestId)
 * - Runs the handler inside AsyncLocalStorage so all downstream code
 *   can call `getLogger()` and get the request-scoped logger
 * - Logs request completion with status code and duration
 * - Logs errors with full cause chain
 *
 * Integrates with `withAuth()` / `withAuthContext()` — wraps them,
 * does not replace them.
 *
 * @example
 * ```ts
 * // In auth guards — already integrated:
 * export function withAuth(handler, options) {
 *   return withLogging(async (request) => {
 *     const user = await requireAuth();
 *     return handler(request, user);
 *   });
 * }
 * ```
 */

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { rootLogger } from "./index";
import { runWithContext } from "./context";

/**
 * Wrap an API route handler with request logging and context propagation.
 * Generates a requestId, starts a timer, and logs completion/errors.
 */
export function withLogging(
  handler: (request: Request) => Promise<NextResponse>
) {
  return async (request: Request): Promise<NextResponse> => {
    const requestId =
      request.headers.get("x-request-id") ?? randomUUID().slice(0, 12);
    const method = request.method;
    const url = new URL(request.url);
    const path = url.pathname;

    const child = rootLogger.child({
      requestId,
      method,
      path,
    });

    const startTime = performance.now();

    return runWithContext(
      { requestId, method, path, startTime, logger: child },
      async () => {
        child.info("Request started");
        try {
          const response = await handler(request);
          const duration = Math.round(performance.now() - startTime);
          const statusCode = response.status;

          if (statusCode >= 500) {
            child.error({ statusCode, duration }, "Request failed");
          } else if (statusCode >= 400) {
            child.warn({ statusCode, duration }, "Request client error");
          } else {
            child.info({ statusCode, duration }, "Request completed");
          }

          return response;
        } catch (err) {
          const duration = Math.round(performance.now() - startTime);
          child.error(
            { err, duration },
            "Request threw unhandled error"
          );
          return NextResponse.json(
            {
              error: {
                code: "INTERNAL_ERROR",
                message: "An unexpected error occurred",
              },
              timestamp: new Date().toISOString(),
            },
            { status: 500 }
          );
        }
      }
    );
  };
}

/**
 * Wrap a dynamic API route handler (with params context) with logging.
 * Same as `withLogging` but passes the Next.js route context through.
 */
export function withLoggingContext(
  handler: (
    request: Request,
    context: { params: Promise<Record<string, string>> }
  ) => Promise<NextResponse>
) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const requestId =
      request.headers.get("x-request-id") ?? randomUUID().slice(0, 12);
    const method = request.method;
    const url = new URL(request.url);
    const path = url.pathname;

    const child = rootLogger.child({
      requestId,
      method,
      path,
    });

    const startTime = performance.now();

    return runWithContext(
      { requestId, method, path, startTime, logger: child },
      async () => {
        child.info("Request started");
        try {
          const response = await handler(request, context);
          const duration = Math.round(performance.now() - startTime);
          const statusCode = response.status;

          if (statusCode >= 500) {
            child.error({ statusCode, duration }, "Request failed");
          } else if (statusCode >= 400) {
            child.warn({ statusCode, duration }, "Request client error");
          } else {
            child.info({ statusCode, duration }, "Request completed");
          }

          return response;
        } catch (err) {
          const duration = Math.round(performance.now() - startTime);
          child.error(
            { err, duration },
            "Request threw unhandled error"
          );
          return NextResponse.json(
            {
              error: {
                code: "INTERNAL_ERROR",
                message: "An unexpected error occurred",
              },
              timestamp: new Date().toISOString(),
            },
            { status: 500 }
          );
        }
      }
    );
  };
}

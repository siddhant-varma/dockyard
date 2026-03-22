/**
 * API route and page guard wrappers for DockYard.
 *
 * `withAuth` wraps a static API route handler with authentication + role checks.
 * `withAuthContext` wraps a dynamic API route handler (with params) similarly.
 *
 * Both wrappers integrate structured logging via `withLogging` / `withLoggingContext`:
 * - Generates a unique requestId per request
 * - Logs request start, completion (with duration), and errors
 * - Propagates context via AsyncLocalStorage so all downstream code
 *   can call `getLogger()` and get the request-scoped logger
 *
 * @example
 * ```ts
 * // Static route — require any authenticated user:
 * export const GET = withAuth(async (req, user) => {
 *   return apiSuccess({ projects: [] });
 * });
 *
 * // Dynamic route — access route params:
 * export const GET = withAuthContext(async (req, user, ctx) => {
 *   const { slug } = await ctx.params;
 *   return apiSuccess({ slug });
 * });
 *
 * // Require superadmin:
 * export const DELETE = withAuth(
 *   async (req, user) => { ... },
 *   { role: "superadmin" }
 * );
 * ```
 */

import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { apiError } from "@/lib/api/response";
import { requireAuth, requireRole, type AuthUser } from "./rbac";
import { withLogging, withLoggingContext } from "@/lib/logger/middleware";
import { getLogger } from "@/lib/logger";
import { updateContext } from "@/lib/logger/context";

/** Options for the withAuth wrapper. */
interface AuthOptions {
  /** Minimum role required. Default: any authenticated user. */
  role?: "viewer" | "project_admin" | "superadmin";
}

/** Next.js App Router context for dynamic routes. */
interface RouteContext {
  params: Promise<Record<string, string>>;
}

/** Handler signature for auth-wrapped static API routes. */
type AuthHandler = (
  request: Request,
  user: AuthUser
) => Promise<NextResponse>;

/** Handler signature for auth-wrapped dynamic API routes (with params). */
type AuthContextHandler = (
  request: Request,
  user: AuthUser,
  context: RouteContext
) => Promise<NextResponse>;

/** Shared error-catching logic for auth wrappers. */
function handleAuthError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return apiError(err.code, err.message, err.status);
  }
  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";
  const log = getLogger();
  log.error({ err }, "Unhandled API error");
  return apiError("INTERNAL_ERROR", message, 500);
}

/**
 * Wrap a static API route handler with authentication, role checks, and logging.
 * Use for routes without dynamic params (e.g., /api/settings).
 */
export function withAuth(handler: AuthHandler, options?: AuthOptions) {
  return withLogging(async (request: Request): Promise<NextResponse> => {
    try {
      const user = await requireAuth();
      if (options?.role) {
        requireRole(user, options.role);
      }
      updateContext({ userId: user.id });
      return await handler(request, user);
    } catch (err) {
      return handleAuthError(err);
    }
  });
}

/**
 * Wrap a dynamic API route handler with authentication, role checks, and logging.
 * Use for routes with dynamic params (e.g., /api/projects/[slug]).
 * The route context ({ params }) is passed as the third argument.
 */
export function withAuthContext(
  handler: AuthContextHandler,
  options?: AuthOptions
) {
  return withLoggingContext(
    async (
      request: Request,
      context: RouteContext
    ): Promise<NextResponse> => {
      try {
        const user = await requireAuth();
        if (options?.role) {
          requireRole(user, options.role);
        }
        updateContext({ userId: user.id });
        return await handler(request, user, context);
      } catch (err) {
        return handleAuthError(err);
      }
    }
  );
}

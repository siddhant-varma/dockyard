/**
 * API route and page guard wrappers for DockYard.
 *
 * `withAuth` wraps an API route handler with authentication + role checks.
 * Use it to protect API endpoints declaratively.
 *
 * @example
 * ```ts
 * // Require any authenticated user:
 * export const GET = withAuth(async (req, user) => {
 *   return apiSuccess({ projects: [] });
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

/** Options for the withAuth wrapper. */
interface AuthOptions {
  /** Minimum role required. Default: any authenticated user. */
  role?: "viewer" | "project_admin" | "superadmin";
}

/** Handler signature for auth-wrapped API routes. */
type AuthHandler = (request: Request, user: AuthUser) => Promise<NextResponse>;

/**
 * Wrap an API route handler with authentication and optional role checks.
 * Catches ApiError and returns structured error responses.
 */
export function withAuth(handler: AuthHandler, options?: AuthOptions) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      const user = await requireAuth();
      if (options?.role) {
        requireRole(user, options.role);
      }
      return await handler(request, user);
    } catch (err) {
      if (err instanceof ApiError) {
        return apiError(err.code, err.message, err.status);
      }
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      console.error("Unhandled API error:", err);
      return apiError("INTERNAL_ERROR", message, 500);
    }
  };
}

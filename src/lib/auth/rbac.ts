/**
 * Role-based access control helpers for DockYard.
 *
 * Use these in API routes and server components to enforce
 * authentication and role requirements.
 *
 * @example
 * ```ts
 * // In an API route:
 * const user = await requireAuth();
 * await requireRole(user, "superadmin");
 *
 * // In a server component:
 * const user = await requireAuth();
 * ```
 */

import { auth } from "./config";
import { ApiError } from "@/lib/api/errors";
import { isAuthEnabled } from "@/lib/env";

/** User session with role information. */
export interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: string;
}

/** Anonymous superadmin returned when auth is disabled. */
const ANONYMOUS_SUPERADMIN: AuthUser = {
  id: "anonymous",
  name: "Admin",
  email: null,
  image: null,
  role: "superadmin",
};

/** Valid DockYard user roles in ascending privilege order. */
const ROLE_HIERARCHY = ["viewer", "project_admin", "superadmin"] as const;
type Role = (typeof ROLE_HIERARCHY)[number];

/**
 * Require an authenticated, non-expired session. Throws 401 if not
 * authenticated or if the session has expired (idle/absolute timeout).
 * When DOCKYARD_AUTH_ENABLED=false, returns an anonymous superadmin.
 *
 * @returns The authenticated user from the session
 * @throws ApiError with code UNAUTHORIZED if no session or session expired
 */
export async function requireAuth(): Promise<AuthUser> {
  if (!isAuthEnabled) {
    return ANONYMOUS_SUPERADMIN;
  }
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError("UNAUTHORIZED", "Authentication required");
  }
  if (session.expired) {
    throw new ApiError(
      "UNAUTHORIZED",
      `Session expired: ${session.expiredReason ?? "timeout"}`
    );
  }
  return session.user as AuthUser;
}

/**
 * Require a specific role (or higher). Throws 403 if insufficient.
 *
 * @param user - The authenticated user (from requireAuth)
 * @param minimumRole - The minimum role required
 * @throws ApiError with code FORBIDDEN if role is insufficient
 */
export function requireRole(user: AuthUser, minimumRole: Role): void {
  const userLevel = ROLE_HIERARCHY.indexOf(user.role as Role);
  const requiredLevel = ROLE_HIERARCHY.indexOf(minimumRole);

  if (userLevel < 0 || userLevel < requiredLevel) {
    throw new ApiError("FORBIDDEN", `Requires ${minimumRole} role or higher`);
  }
}

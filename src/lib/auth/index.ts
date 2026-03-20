/**
 * Auth module re-exports.
 *
 * Import auth utilities from this barrel file:
 * ```ts
 * import { auth, signIn, signOut } from "@/lib/auth";
 * ```
 */

export { auth, signIn, signOut, handlers } from "./config";
export { requireAuth, requireRole, type AuthUser } from "./rbac";
export { withAuth } from "./guards";

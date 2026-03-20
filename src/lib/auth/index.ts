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
export { withAuth, withAuthContext } from "./guards";
export {
  checkProjectPermission,
  requireProjectPermission,
  resolveProjectId,
  type ProjectAction,
} from "./permissions";
export {
  generateRegistrationOpts,
  registerCredential,
  generateAuthenticationOpts,
  verifyAuthentication,
} from "./webauthn";
export {
  generateTotpSecret,
  verifyTotp,
  verifyAndActivateTotp,
  removeTotpCredential,
} from "./totp";
export {
  logAudit,
  getAuditLog,
  getAuditLogForEntity,
  type AuditLogInput,
  type AuditLogFilters,
} from "./audit";
export {
  requireReAuth,
  confirmReAuth,
  type ReAuthMethod,
  type ReAuthStatus,
} from "./jit-reauth";

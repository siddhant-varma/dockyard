/**
 * Type augmentations for Auth.js session objects.
 * Adds role, session timeout tracking, and expiry fields.
 */

import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
    /** When true, the session has expired (idle or absolute timeout). */
    expired?: boolean;
    /** Reason for expiry: "idle", "absolute", or "revoked". */
    expiredReason?: "idle" | "absolute" | "revoked";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: string;
    /** Unix timestamp (seconds) when the token was first issued. */
    issuedAt?: number;
    /** Unix timestamp (seconds) of the last user activity. */
    lastActivity?: number;
    /** Whether this token has been marked as expired by timeout or revocation. */
    expired?: boolean;
    /** Reason for expiry: "idle", "absolute", or "revoked". */
    expiredReason?: "idle" | "absolute" | "revoked";
  }
}

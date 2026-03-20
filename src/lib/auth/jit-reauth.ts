/**
 * Just-in-time re-authentication service for DockYard.
 *
 * Destructive actions (project delete, config apply, server restart,
 * user role change) require the user to re-authenticate within a short
 * window before the operation proceeds. This prevents session hijacking
 * from silently executing dangerous operations.
 *
 * Re-auth timestamps are stored in-memory with a 5-minute TTL. In a
 * multi-instance deployment, this should be replaced with a shared cache.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { mfaCredentials } from "@/db/schema";
import { verifyAuthentication } from "./webauthn";
import { verifyTotp } from "./totp";

/** Re-auth window in milliseconds (5 minutes). */
const REAUTH_WINDOW_MS = 5 * 60 * 1000;

/** In-memory store of re-auth timestamps keyed by userId. */
const reAuthTimestamps = new Map<string, number>();

/** Available MFA methods for a user. */
export type ReAuthMethod = "fido2" | "totp" | "password";

/** Result of checking re-auth status. */
export interface ReAuthStatus {
  required: boolean;
  methods: ReAuthMethod[];
  /** Seconds remaining until re-auth expires (0 if not authenticated). */
  expiresInSecs: number;
}

/**
 * Check if a user needs to re-authenticate for a destructive action.
 *
 * @param userId - The user's database ID
 * @returns Status indicating if re-auth is required and available methods
 */
export async function requireReAuth(userId: string): Promise<ReAuthStatus> {
  const lastReAuth = reAuthTimestamps.get(userId);
  const now = Date.now();

  if (lastReAuth && now - lastReAuth < REAUTH_WINDOW_MS) {
    const expiresInSecs = Math.ceil(
      (REAUTH_WINDOW_MS - (now - lastReAuth)) / 1000
    );
    return { required: false, methods: [], expiresInSecs };
  }

  const methods = await getAvailableMethods(userId);

  return { required: true, methods, expiresInSecs: 0 };
}

/**
 * Confirm re-authentication using a FIDO2 assertion or TOTP code.
 *
 * @param userId - The user's database ID
 * @param method - The MFA method used
 * @param credential - Method-specific credential data
 * @returns Object with `verified` boolean and optional error message
 */
export async function confirmReAuth(
  userId: string,
  method: ReAuthMethod,
  credential: {
    /** For FIDO2: the assertion response and challenge. */
    assertion?: unknown;
    challenge?: string;
    /** For TOTP: the 6-digit code. */
    code?: string;
  }
): Promise<{ verified: boolean; error?: string }> {
  let result: { verified: boolean; error?: string };

  switch (method) {
    case "fido2": {
      if (!credential.assertion || !credential.challenge) {
        return { verified: false, error: "Missing FIDO2 assertion or challenge" };
      }
      result = await verifyAuthentication(
        userId,
        credential.challenge,
        credential.assertion as Parameters<typeof verifyAuthentication>[2]
      );
      break;
    }
    case "totp": {
      if (!credential.code) {
        return { verified: false, error: "Missing TOTP code" };
      }
      result = await verifyTotp(userId, credential.code);
      break;
    }
    case "password": {
      return { verified: false, error: "Password re-auth not yet implemented" };
    }
    default:
      return { verified: false, error: `Unknown method: ${method}` };
  }

  if (result.verified) {
    reAuthTimestamps.set(userId, Date.now());
  }

  return result;
}

/**
 * Get the MFA methods available to a user for re-authentication.
 */
async function getAvailableMethods(
  userId: string
): Promise<ReAuthMethod[]> {
  const credentials = await db
    .select({ type: mfaCredentials.type })
    .from(mfaCredentials)
    .where(eq(mfaCredentials.userId, userId));

  const methods: ReAuthMethod[] = [];
  const types = new Set(credentials.map((c) => c.type));

  if (types.has("fido2")) methods.push("fido2");
  if (types.has("totp")) methods.push("totp");
  methods.push("password");

  return methods;
}

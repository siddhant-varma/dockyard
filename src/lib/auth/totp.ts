/**
 * TOTP (Time-based One-Time Password) MFA for DockYard.
 *
 * Provides enrollment (secret generation + QR code URI) and verification
 * for authenticator apps like Google Authenticator, Authy, or 1Password.
 *
 * TOTP secrets are encrypted at rest using AES-256-GCM before storage
 * in the `mfa_credentials` table. Verification uses a ±1 step tolerance
 * (30-second windows) to accommodate clock drift.
 *
 * Uses the `otpauth` library for RFC 6238 compliant TOTP generation.
 *
 * @see https://github.com/hectorm/otpauth
 */

import { TOTP, Secret } from "otpauth";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/connection";
import { mfaCredentials, users } from "@/db/schema";
import { encrypt, decrypt } from "@/lib/crypto/aes";
import { ApiError } from "@/lib/api/errors";

/** TOTP configuration constants. */
const TOTP_ISSUER = "DockYard";
const TOTP_ALGORITHM = "SHA1";
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;

/** Shape of the TOTP credential data stored (encrypted) in the DB. */
interface StoredTotpCredential {
  secret: string;
}

/**
 * Create a TOTP instance from a base32-encoded secret.
 */
function createTotp(secret: string, accountName: string): TOTP {
  return new TOTP({
    issuer: TOTP_ISSUER,
    label: accountName,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: Secret.fromBase32(secret),
  });
}

/**
 * Generate a new TOTP secret for a user and store it in the database.
 *
 * Returns the secret as a QR code-compatible `otpauth://` URI that can
 * be rendered as a QR code for the user to scan with their authenticator app.
 * Also returns the raw base32 secret for manual entry.
 *
 * The credential is stored but the user's `mfa_enabled` flag is NOT set yet —
 * call `verifyAndActivateTotp()` after the user confirms with a valid code.
 *
 * @param userId - The user's database ID
 * @param userEmail - The user's email (used as the TOTP account name)
 * @param credentialName - User-friendly name (e.g., "Google Authenticator")
 * @returns Object with `credentialId`, `uri` (otpauth:// URL), and `secret` (base32)
 * @throws ApiError if the user already has a TOTP credential
 */
export async function generateTotpSecret(
  userId: string,
  userEmail: string,
  credentialName: string
): Promise<{ credentialId: string; uri: string; secret: string }> {
  const existing = await db
    .select({ id: mfaCredentials.id })
    .from(mfaCredentials)
    .where(
      and(eq(mfaCredentials.userId, userId), eq(mfaCredentials.type, "totp"))
    )
    .limit(1);

  if (existing.length > 0) {
    throw new ApiError(
      "CONFLICT",
      "TOTP credential already exists. Remove it before enrolling a new one."
    );
  }

  const secret = new Secret({ size: 20 });
  const totp = createTotp(secret.base32, userEmail);

  const storedData: StoredTotpCredential = {
    secret: secret.base32,
  };

  const [inserted] = await db
    .insert(mfaCredentials)
    .values({
      userId,
      type: "totp",
      credentialData: encrypt(JSON.stringify(storedData)),
      name: credentialName,
    })
    .returning({ id: mfaCredentials.id });

  return {
    credentialId: inserted.id,
    uri: totp.toString(),
    secret: secret.base32,
  };
}

/**
 * Verify a TOTP code and activate MFA for the user.
 *
 * This is called during initial enrollment after the user scans the QR code
 * and enters their first valid code. On success, sets `mfa_enabled = true`
 * and `mfa_method = "totp"` on the user record.
 *
 * @param userId - The user's database ID
 * @param code - The 6-digit TOTP code from the authenticator app
 * @returns True if the code is valid and MFA was activated
 * @throws ApiError if no TOTP credential is found
 */
export async function verifyAndActivateTotp(
  userId: string,
  code: string
): Promise<boolean> {
  const result = await verifyTotp(userId, code);
  if (!result.verified) {
    return false;
  }

  await db
    .update(users)
    .set({ mfaEnabled: true, mfaMethod: "totp" })
    .where(eq(users.id, userId));

  return true;
}

/**
 * Verify a 6-digit TOTP code against the user's stored secret.
 *
 * Uses a ±1 step tolerance window (30 seconds before/after current step)
 * to accommodate minor clock drift between the server and the user's device.
 *
 * @param userId - The user's database ID
 * @param code - The 6-digit TOTP code from the authenticator app
 * @returns Object with `verified: boolean` and descriptive `error` on failure
 * @throws ApiError if no TOTP credential is found for the user
 */
export async function verifyTotp(
  userId: string,
  code: string
): Promise<{ verified: boolean; error?: string }> {
  const rows = await db
    .select()
    .from(mfaCredentials)
    .where(
      and(eq(mfaCredentials.userId, userId), eq(mfaCredentials.type, "totp"))
    )
    .limit(1);

  if (rows.length === 0) {
    throw new ApiError("BAD_REQUEST", "No TOTP credential registered");
  }

  const row = rows[0];
  const storedData = JSON.parse(
    decrypt(row.credentialData)
  ) as StoredTotpCredential;

  const totp = createTotp(storedData.secret, userId);

  const delta = totp.validate({ token: code, window: 1 });

  if (delta === null) {
    return { verified: false, error: "Invalid or expired TOTP code" };
  }

  await db
    .update(mfaCredentials)
    .set({ lastUsedAt: new Date() })
    .where(eq(mfaCredentials.id, row.id));

  return { verified: true };
}

/**
 * Remove a user's TOTP credential.
 *
 * If the user has no remaining MFA credentials after removal,
 * sets `mfa_enabled = false` on their user record.
 *
 * @param userId - The user's database ID
 * @returns True if a credential was removed
 */
export async function removeTotpCredential(userId: string): Promise<boolean> {
  const deleted = await db
    .delete(mfaCredentials)
    .where(
      and(eq(mfaCredentials.userId, userId), eq(mfaCredentials.type, "totp"))
    )
    .returning({ id: mfaCredentials.id });

  if (deleted.length === 0) {
    return false;
  }

  const remaining = await db
    .select({ id: mfaCredentials.id })
    .from(mfaCredentials)
    .where(eq(mfaCredentials.userId, userId))
    .limit(1);

  if (remaining.length === 0) {
    await db
      .update(users)
      .set({ mfaEnabled: false, mfaMethod: null })
      .where(eq(users.id, userId));
  }

  return true;
}

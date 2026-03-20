/**
 * WebAuthn (FIDO2) credential management for DockYard MFA.
 *
 * Provides server-side registration and authentication verification
 * using the Web Authentication API (WebAuthn). Supports passkeys and
 * hardware security keys (e.g., YubiKey) as phishing-resistant second
 * factors.
 *
 * Uses `@simplewebauthn/server` v9 for attestation/assertion validation
 * and stores credentials encrypted in the `mfa_credentials` table.
 *
 * @see https://simplewebauthn.dev/docs/
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifyRegistrationResponseOpts,
  type VerifyAuthenticationResponseOpts,
} from "@simplewebauthn/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/connection";
import { mfaCredentials, users } from "@/db/schema";
import { encrypt, decrypt } from "@/lib/crypto/aes";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/api/errors";

/** Shape of the FIDO2 credential data stored (encrypted) in the DB. */
interface StoredFido2Credential {
  /** Base64url-encoded credential ID. */
  credentialID: string;
  /** Base64-encoded COSE public key. */
  publicKey: string;
  /** Signature counter for replay attack detection. */
  counter: number;
  /** Transport hints (usb, ble, nfc, internal). */
  transports?: string[];
}

/**
 * Derive the WebAuthn Relying Party (RP) configuration from environment.
 * In development, uses localhost; in production, uses the configured domain.
 */
function getRpConfig(): { rpName: string; rpID: string; origin: string } {
  const domain = env.DOCKYARD_DOMAIN;
  const isDev = env.NODE_ENV === "development";
  return {
    rpName: "DockYard",
    rpID: isDev ? "localhost" : domain,
    origin: isDev ? "http://localhost:3000" : `https://${domain}`,
  };
}

/** Convert a base64url string to a Uint8Array. */
function base64urlToUint8Array(base64url: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64url, "base64url"));
}

/**
 * Load all existing FIDO2 credentials for a user.
 * Used to exclude already-registered authenticators during registration
 * and to look up credentials during authentication.
 */
async function getUserFido2Credentials(
  userId: string
): Promise<{ id: string; stored: StoredFido2Credential }[]> {
  const rows = await db
    .select()
    .from(mfaCredentials)
    .where(
      and(eq(mfaCredentials.userId, userId), eq(mfaCredentials.type, "fido2"))
    );

  return rows.map((row) => ({
    id: row.id,
    stored: JSON.parse(decrypt(row.credentialData)) as StoredFido2Credential,
  }));
}

/**
 * Generate WebAuthn registration options for a user.
 *
 * Returns the options object that should be passed to
 * `navigator.credentials.create()` on the client. The caller must
 * store the returned `challenge` in the user's session for verification.
 *
 * @param userId - The user's database ID
 * @param userEmail - The user's email (used as WebAuthn user name)
 * @param userName - The user's display name
 * @returns Registration options including the challenge
 */
export async function generateRegistrationOpts(
  userId: string,
  userEmail: string,
  userName: string
) {
  const rp = getRpConfig();
  const existingCredentials = await getUserFido2Credentials(userId);

  const options = await generateRegistrationOptions({
    rpName: rp.rpName,
    rpID: rp.rpID,
    userID: userId,
    userName: userEmail,
    userDisplayName: userName,
    attestationType: "none",
    excludeCredentials: existingCredentials.map((c) => ({
      id: base64urlToUint8Array(c.stored.credentialID),
      type: "public-key" as const,
      transports: c.stored.transports as AuthenticatorTransport[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  return options;
}

/**
 * Verify a WebAuthn registration response and store the credential.
 *
 * Validates the attestation response from the browser, extracts the
 * public key and credential ID, encrypts them, and stores them in
 * the `mfa_credentials` table.
 *
 * @param userId - The user's database ID
 * @param expectedChallenge - The challenge from generateRegistrationOpts (stored in session)
 * @param response - The attestation response JSON from the browser
 * @param credentialName - User-friendly name for this credential (e.g., "YubiKey 5C")
 * @returns The database ID of the newly stored credential
 * @throws ApiError if verification fails
 */
export async function registerCredential(
  userId: string,
  expectedChallenge: string,
  response: VerifyRegistrationResponseOpts["response"],
  credentialName: string
): Promise<string> {
  const rp = getRpConfig();

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new ApiError(
      "BAD_REQUEST",
      "WebAuthn registration verification failed"
    );
  }

  const { credentialID, credentialPublicKey, counter } =
    verification.registrationInfo;

  const storedData: StoredFido2Credential = {
    credentialID: Buffer.from(credentialID).toString("base64url"),
    publicKey: Buffer.from(credentialPublicKey).toString("base64"),
    counter,
    transports: response.response.transports,
  };

  const [inserted] = await db
    .insert(mfaCredentials)
    .values({
      userId,
      type: "fido2",
      credentialData: encrypt(JSON.stringify(storedData)),
      name: credentialName,
    })
    .returning({ id: mfaCredentials.id });

  await db
    .update(users)
    .set({ mfaEnabled: true, mfaMethod: "fido2" })
    .where(eq(users.id, userId));

  return inserted.id;
}

/**
 * Generate WebAuthn authentication options for a user.
 *
 * Returns the options object that should be passed to
 * `navigator.credentials.get()` on the client. The caller must
 * store the returned `challenge` in the session for verification.
 *
 * @param userId - The user's database ID
 * @returns Authentication options including the challenge
 * @throws ApiError if the user has no registered FIDO2 credentials
 */
export async function generateAuthenticationOpts(userId: string) {
  const rp = getRpConfig();
  const existingCredentials = await getUserFido2Credentials(userId);

  if (existingCredentials.length === 0) {
    throw new ApiError("BAD_REQUEST", "No FIDO2 credentials registered");
  }

  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    allowCredentials: existingCredentials.map((c) => ({
      id: base64urlToUint8Array(c.stored.credentialID),
      type: "public-key" as const,
      transports: c.stored.transports as AuthenticatorTransport[],
    })),
    userVerification: "preferred",
  });

  return options;
}

/**
 * Verify a WebAuthn authentication response.
 *
 * Validates the assertion response from the browser against the
 * stored credential, updates the signature counter, and records
 * the last-used timestamp.
 *
 * @param userId - The user's database ID
 * @param expectedChallenge - The challenge from generateAuthenticationOpts (stored in session)
 * @param response - The assertion response JSON from the browser
 * @returns Object with `verified: boolean` and descriptive `error` on failure
 */
export async function verifyAuthentication(
  userId: string,
  expectedChallenge: string,
  response: VerifyAuthenticationResponseOpts["response"]
): Promise<{ verified: boolean; error?: string }> {
  const rp = getRpConfig();
  const existingCredentials = await getUserFido2Credentials(userId);

  const responseCredentialId = response.id;
  const matched = existingCredentials.find(
    (c) => c.stored.credentialID === responseCredentialId
  );

  if (!matched) {
    return { verified: false, error: "Credential not found for this user" };
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      authenticator: {
        credentialID: base64urlToUint8Array(matched.stored.credentialID),
        credentialPublicKey: new Uint8Array(
          Buffer.from(matched.stored.publicKey, "base64")
        ),
        counter: matched.stored.counter,
        transports: matched.stored.transports as AuthenticatorTransport[],
      },
    });

    if (!verification.verified) {
      return { verified: false, error: "Assertion verification failed" };
    }

    const updatedData: StoredFido2Credential = {
      ...matched.stored,
      counter: verification.authenticationInfo.newCounter,
    };
    await db
      .update(mfaCredentials)
      .set({
        credentialData: encrypt(JSON.stringify(updatedData)),
        lastUsedAt: new Date(),
      })
      .where(eq(mfaCredentials.id, matched.id));

    return { verified: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Authentication verification error";
    return { verified: false, error: message };
  }
}

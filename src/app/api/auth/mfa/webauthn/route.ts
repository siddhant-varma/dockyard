/**
 * WebAuthn (FIDO2) registration API endpoints.
 *
 * POST /api/auth/mfa/webauthn — Start registration: generates WebAuthn
 *   registration options (challenge, RP config, excluded credentials).
 *   The challenge is returned to the client and must be sent back in
 *   the PUT request for verification.
 *
 * PUT /api/auth/mfa/webauthn — Complete registration: verifies the
 *   attestation response from the browser and stores the credential.
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/guards";
import {
  generateRegistrationOpts,
  registerCredential,
} from "@/lib/auth/webauthn";
import type { VerifyRegistrationResponseOpts } from "@simplewebauthn/server";

/**
 * POST /api/auth/mfa/webauthn — Generate WebAuthn registration options.
 *
 * Returns the options object needed by `navigator.credentials.create()`.
 * The `challenge` field must be stored client-side and sent back with
 * the PUT request to complete registration.
 */
export const POST = withAuth(async (_request, user) => {
  const options = await generateRegistrationOpts(
    user.id,
    user.email ?? "",
    user.name ?? "DockYard User"
  );

  return NextResponse.json({
    data: options,
  });
});

/**
 * PUT /api/auth/mfa/webauthn — Verify attestation and store credential.
 *
 * Expects JSON body:
 * - `challenge`: The challenge from the POST response
 * - `attestation`: The attestation response from `navigator.credentials.create()`
 * - `name`: User-friendly name for this credential (e.g., "MacBook Pro TouchID")
 */
export const PUT = withAuth(async (request, user) => {
  const body = (await request.json()) as {
    challenge?: string;
    attestation?: VerifyRegistrationResponseOpts["response"];
    name?: string;
  };

  if (!body.challenge) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "challenge is required" } },
      { status: 400 }
    );
  }

  if (!body.attestation) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "attestation is required" } },
      { status: 400 }
    );
  }

  const credentialName = body.name ?? "Passkey";

  const credentialId = await registerCredential(
    user.id,
    body.challenge,
    body.attestation,
    credentialName
  );

  return NextResponse.json({
    data: { credentialId, name: credentialName },
  });
});

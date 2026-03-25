/**
 * TOTP authenticator enrollment API endpoints.
 *
 * POST /api/auth/mfa/totp — Generate a new TOTP secret and return the
 *   otpauth:// URI (for QR code rendering) and the base32 secret
 *   (for manual entry). The credential is stored but not yet activated.
 *
 * PUT /api/auth/mfa/totp — Verify a 6-digit TOTP code from the user's
 *   authenticator app and activate TOTP MFA on their account.
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/guards";
import {
  generateTotpSecret,
  verifyAndActivateTotp,
  removeTotpCredential,
} from "@/lib/auth/totp";

/**
 * POST /api/auth/mfa/totp — Generate TOTP secret + QR URI.
 *
 * Optionally accepts JSON body with `name` (credential label).
 * Returns `uri` (otpauth:// URL for QR code) and `secret` (base32 for manual entry).
 */
export const POST = withAuth(async (request, user) => {
  let name = "Authenticator App";
  try {
    const body = (await request.json()) as { name?: string };
    if (body.name) {
      name = body.name;
    }
  } catch {
    // No body or invalid JSON — use default name
  }

  const result = await generateTotpSecret(user.id, user.email ?? "", name);

  return NextResponse.json({
    data: {
      credentialId: result.credentialId,
      uri: result.uri,
      secret: result.secret,
    },
  });
});

/**
 * PUT /api/auth/mfa/totp — Verify TOTP code and activate MFA.
 *
 * Expects JSON body with `code` (6-digit TOTP from authenticator app).
 * On success, sets mfa_enabled=true and mfa_method="totp" on the user.
 */
export const PUT = withAuth(async (request, user) => {
  const body = (await request.json()) as { code?: string };

  if (!body.code || body.code.length !== 6) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "A valid 6-digit code is required",
        },
      },
      { status: 400 }
    );
  }

  const activated = await verifyAndActivateTotp(user.id, body.code);

  if (!activated) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Invalid or expired TOTP code",
        },
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    data: { activated: true },
  });
});

/**
 * DELETE /api/auth/mfa/totp — Remove TOTP credential.
 *
 * Deletes the user's TOTP credential and disables MFA if no other
 * credentials remain.
 */
export const DELETE = withAuth(async (_request, user) => {
  const removed = await removeTotpCredential(user.id);

  if (!removed) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "No TOTP credential found to remove",
        },
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: { removed: true } });
});

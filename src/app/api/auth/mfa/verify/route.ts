/**
 * MFA verification endpoint — POST /api/auth/mfa/verify
 *
 * Called during login when 2FA is enforced. Verifies the TOTP code
 * and clears the mfaPending flag by setting a short-lived mfa-verified cookie.
 * The middleware checks for this cookie to allow access past the MFA gate.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { withAuth } from "@/lib/auth/guards";
import { verifyTotp } from "@/lib/auth/totp";

/** MFA verification cookie: 8 hours (matches session absolute timeout). */
const MFA_COOKIE_MAX_AGE = 8 * 60 * 60;

/**
 * POST /api/auth/mfa/verify — Verify TOTP code during login.
 *
 * Body: { code: string }
 * On success, sets an `mfa-verified` cookie and returns 200.
 */
export const POST = withAuth(async (request, user) => {
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

  const result = await verifyTotp(user.id, body.code);

  if (!result.verified) {
    return NextResponse.json(
      {
        error: { code: "BAD_REQUEST", message: result.error ?? "Invalid code" },
      },
      { status: 400 }
    );
  }

  // Set mfa-verified cookie so middleware knows MFA is complete
  const cookieJar = await cookies();
  cookieJar.set("mfa-verified", "true", {
    httpOnly: true,
    secure: process.env.AUTH_URL?.startsWith("https") ?? false,
    sameSite: "lax",
    path: "/",
    maxAge: MFA_COOKIE_MAX_AGE,
  });

  return NextResponse.json({ data: { verified: true } });
});

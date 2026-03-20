/**
 * JIT re-authentication API endpoint.
 *
 * POST accepts a FIDO2 assertion or TOTP code to confirm the user's
 * identity before destructive operations proceed.
 *
 * GET returns the current re-auth status (whether re-auth is required
 * and which methods are available).
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/guards";
import { requireReAuth, confirmReAuth, type ReAuthMethod } from "@/lib/auth/jit-reauth";

/** GET /api/auth/reauth — Check re-auth status. */
export const GET = withAuth(async (_request, user) => {
  const status = await requireReAuth(user.id);
  return NextResponse.json(status);
});

/** POST /api/auth/reauth — Confirm re-authentication. */
export const POST = withAuth(async (request, user) => {
  const body = (await request.json()) as {
    method: ReAuthMethod;
    assertion?: unknown;
    challenge?: string;
    code?: string;
  };

  if (!body.method) {
    return NextResponse.json(
      { error: "method is required (fido2, totp, or password)" },
      { status: 400 }
    );
  }

  const result = await confirmReAuth(user.id, body.method, {
    assertion: body.assertion,
    challenge: body.challenge,
    code: body.code,
  });

  if (!result.verified) {
    return NextResponse.json(
      { verified: false, error: result.error },
      { status: 401 }
    );
  }

  return NextResponse.json({ verified: true });
});

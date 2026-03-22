/**
 * MFA credentials listing API endpoint.
 *
 * GET /api/auth/mfa — Returns the authenticated user's MFA credentials.
 * Each credential includes its type (fido2 or totp), friendly name,
 * creation date, and last-used timestamp. Credential data (keys, secrets)
 * is never exposed to the client.
 */

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/auth/guards";
import { db } from "@/db/connection";
import { mfaCredentials } from "@/db/schema";

/** Public shape of an MFA credential (no secret data). */
interface MfaCredentialResponse {
  id: string;
  type: "fido2" | "totp";
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

/** GET /api/auth/mfa — List all MFA credentials for the current user. */
export const GET = withAuth(async (_request, user) => {
  const rows = await db
    .select({
      id: mfaCredentials.id,
      type: mfaCredentials.type,
      name: mfaCredentials.name,
      createdAt: mfaCredentials.createdAt,
      lastUsedAt: mfaCredentials.lastUsedAt,
    })
    .from(mfaCredentials)
    .where(eq(mfaCredentials.userId, user.id));

  const credentials: MfaCredentialResponse[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
  }));

  return NextResponse.json({ data: credentials });
});

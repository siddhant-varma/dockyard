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
import { mfaCredentials, platformSettings } from "@/db/schema";

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

  // Read global MFA enforcement setting from platform_settings
  let mfaEnabled = false;
  try {
    const settings = await db.query.platformSettings.findFirst();
    const s = settings?.settings as Record<string, unknown> | null;
    mfaEnabled = s?.mfaEnforced === true;
  } catch {
    /* table may not exist yet */
  }

  return NextResponse.json({ data: credentials, mfaEnabled });
});

/**
 * PUT /api/auth/mfa — Toggle global MFA enforcement.
 *
 * Body: { mfaEnabled: boolean }
 * Stores the setting in platform_settings. When enabled AND DOCKYARD_MODE=server,
 * the login flow requires TOTP verification after successful credentials auth.
 */
export const PUT = withAuth(
  async (request) => {
    const body = (await request.json()) as { mfaEnabled?: boolean };
    const enabled = body.mfaEnabled === true;

    // Upsert into platform_settings (single-row table)
    const existing = await db.query.platformSettings.findFirst();
    const currentSettings =
      (existing?.settings as Record<string, unknown>) ?? {};
    const newSettings = { ...currentSettings, mfaEnforced: enabled };

    if (existing) {
      await db
        .update(platformSettings)
        .set({ settings: newSettings })
        .where(eq(platformSettings.id, existing.id));
    } else {
      await db.insert(platformSettings).values({
        operatingMode: "vps",
        settings: newSettings,
      });
    }

    return NextResponse.json({ data: { mfaEnabled: enabled } });
  },
  { role: "superadmin" }
);

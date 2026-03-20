import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { platformSettings } from "@/db/schema";
import { withAuth } from "@/lib/auth/guards";
import { logAudit } from "@/lib/auth/audit";

/**
 * GET /api/settings
 * Returns the current platform settings (operating mode, scan config).
 */
export const GET = withAuth(async () => {
  const settings = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.id, "singleton"),
  });

  if (!settings) {
    // Auto-create default settings if none exist
    const [created] = await db
      .insert(platformSettings)
      .values({
        id: "singleton",
        operatingMode: "local",
        autoScan: true,
        scanInterval: 300,
      })
      .returning();
    return NextResponse.json(created);
  }

  return NextResponse.json(settings);
});

/**
 * PUT /api/settings
 * Update platform settings. Accepts partial updates.
 */
export const PUT = withAuth(
  async (request, user) => {
    const body = (await request.json()) as Record<string, unknown>;

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.operatingMode === "local" || body.operatingMode === "vps") {
      updates.operatingMode = body.operatingMode;
    }

    if (typeof body.autoScan === "boolean") {
      updates.autoScan = body.autoScan;
    }

    if (typeof body.scanInterval === "number" && body.scanInterval >= 30) {
      updates.scanInterval = body.scanInterval;
    }

    if (body.settings !== undefined) {
      updates.settings = body.settings;
    }

    const [updated] = await db
      .update(platformSettings)
      .set(updates)
      .where(eq(platformSettings.id, "singleton"))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Settings not found. Call GET first to initialize." },
        { status: 404 }
      );
    }

    await logAudit({
      actorId: user.id,
      action: "settings.update",
      targetType: "platform_settings",
      targetId: "singleton",
      request,
    });

    return NextResponse.json(updated);
  },
  { role: "superadmin" }
);

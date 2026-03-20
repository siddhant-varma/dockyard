import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { platformSettings } from "@/db/schema";

/**
 * GET /api/settings
 * Returns the current platform settings (operating mode, scan config).
 */
export async function GET() {
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
}

/**
 * PUT /api/settings
 * Update platform settings. Accepts partial updates.
 */
export async function PUT(request: NextRequest) {
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

  return NextResponse.json(updated);
}

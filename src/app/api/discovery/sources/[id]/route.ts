import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { discoverySources } from "@/db/schema";
import { withAuthContext } from "@/lib/auth/guards";
import { logAudit } from "@/lib/auth/audit";

/**
 * PUT /api/discovery/sources/:id
 * Update an existing discovery source.
 */
export const PUT = withAuthContext(
  async (request, user, context) => {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof body.name === "string") updates.name = body.name;
    if (typeof body.config === "object" && body.config !== null)
      updates.config = body.config;
    if (typeof body.enabled === "boolean") updates.enabled = body.enabled;

    const [updated] = await db
      .update(discoverySources)
      .set(updates)
      .where(eq(discoverySources.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Discovery source not found" },
        { status: 404 }
      );
    }

    await logAudit({
      actorId: user.id,
      action: "discovery_source.update",
      targetType: "discovery_source",
      targetId: id,
      request,
    });

    return NextResponse.json(updated);
  },
  { role: "superadmin" }
);

/**
 * DELETE /api/discovery/sources/:id
 * Remove a discovery source.
 */
export const DELETE = withAuthContext(
  async (request, user, context) => {
    const { id } = await context.params;

    const [deleted] = await db
      .delete(discoverySources)
      .where(eq(discoverySources.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Discovery source not found" },
        { status: 404 }
      );
    }

    await logAudit({
      actorId: user.id,
      action: "discovery_source.delete",
      targetType: "discovery_source",
      targetId: id,
      request,
    });

    return NextResponse.json({ deleted: true });
  },
  { role: "superadmin" }
);

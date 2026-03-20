import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { discoverySources } from "@/db/schema";

type Params = Promise<{ id: string }>;

/**
 * PUT /api/discovery/sources/:id
 * Update an existing discovery source.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { id } = await params;
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

  return NextResponse.json(updated);
}

/**
 * DELETE /api/discovery/sources/:id
 * Remove a discovery source.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Params }
) {
  const { id } = await params;

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

  return NextResponse.json({ deleted: true });
}

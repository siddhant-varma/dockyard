import { NextRequest, NextResponse } from "next/server";
import { upsertConfigEntry, deleteConfigEntry } from "@/lib/config/service";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/auth/audit";

type Params = Promise<{ slug: string; id: string }>;

/** PUT /api/projects/:slug/config/:id — Update config entry. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;

  if (typeof body.value !== "string") {
    return NextResponse.json({ error: "value is required" }, { status: 400 });
  }

  await upsertConfigEntry(id, (body.key as string) ?? "", body.value, {
    isSecret: body.isSecret as boolean | undefined,
    category: body.category as string | undefined,
    changedBy: session.user.id,
    changeReason: body.reason as string | undefined,
  });

  await logAudit({
    actorId: session.user.id,
    action: "config_entry.update",
    targetType: "config_entry",
    targetId: id,
    request,
  });

  return NextResponse.json({ updated: true });
}

/** DELETE /api/projects/:slug/config/:id — Delete config entry. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await deleteConfigEntry(id);

  await logAudit({
    actorId: session.user.id,
    action: "config_entry.delete",
    targetType: "config_entry",
    targetId: id,
    request,
  });

  return NextResponse.json({ deleted: true });
}

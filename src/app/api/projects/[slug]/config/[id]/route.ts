import { NextRequest, NextResponse } from "next/server";
import { upsertConfigEntry, deleteConfigEntry } from "@/lib/config/service";
import { auth } from "@/lib/auth";

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

  return NextResponse.json({ updated: true });
}

/** DELETE /api/projects/:slug/config/:id — Delete config entry. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Params }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await deleteConfigEntry(id);
  return NextResponse.json({ deleted: true });
}

import { NextResponse } from "next/server";
import { addTimelineEntry } from "@/lib/incidents/service";
import { withAuthContext } from "@/lib/auth/guards";
import { logAudit } from "@/lib/auth/audit";

/** POST /api/incidents/:id/timeline — Add a timeline entry to an incident. */
export const POST = withAuthContext(async (request, user, context) => {
  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;

  if (!body.actor || !body.action) {
    return NextResponse.json(
      { error: "actor and action are required" },
      { status: 400 },
    );
  }

  const entry = await addTimelineEntry(id, {
    actor: String(body.actor),
    action: String(body.action),
    note: body.note ? String(body.note) : undefined,
  });

  await logAudit({
    actorId: user.id,
    action: "incident.timeline_add",
    targetType: "incident",
    targetId: id,
    diff: { actor: body.actor, action: body.action },
    request,
  });

  return NextResponse.json(entry, { status: 201 });
});

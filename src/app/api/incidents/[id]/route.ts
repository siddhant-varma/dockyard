import { NextResponse } from "next/server";
import { getIncident, updateIncidentStatus } from "@/lib/incidents/service";
import { withAuthContext } from "@/lib/auth/guards";
import { logAudit } from "@/lib/auth/audit";

/** GET /api/incidents/:id — Get incident details. */
export const GET = withAuthContext(async (_request, _user, context) => {
  const { id } = await context.params;
  const incident = await getIncident(id);

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  return NextResponse.json(incident);
});

/** PUT /api/incidents/:id — Update incident status. */
export const PUT = withAuthContext(async (request, user, context) => {
  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;

  if (!body.status) {
    return NextResponse.json(
      { error: "status is required" },
      { status: 400 },
    );
  }

  const updated = await updateIncidentStatus(id, {
    status: String(body.status),
    note: body.note ? String(body.note) : undefined,
    updatedBy: user.id,
  });

  if (!updated) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  await logAudit({
    actorId: user.id,
    action: "incident.update_status",
    targetType: "incident",
    targetId: id,
    diff: { status: body.status, note: body.note ?? null },
    request,
  });

  return NextResponse.json(updated);
});

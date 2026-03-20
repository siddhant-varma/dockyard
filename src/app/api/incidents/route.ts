import { NextResponse } from "next/server";
import { listIncidents, createIncident } from "@/lib/incidents/service";
import { withAuth } from "@/lib/auth/guards";
import { logAudit } from "@/lib/auth/audit";

/** GET /api/incidents — List incidents, optionally filtered by status, severity, or project. */
export const GET = withAuth(async (request) => {
  const sp = new URL(request.url).searchParams;
  const status = sp.get("status") ?? undefined;
  const severity = sp.get("severity") ?? undefined;
  const projectId = sp.get("project_id") ?? undefined;

  const incidents = await listIncidents({ status, severity, projectId });
  return NextResponse.json(incidents);
});

/** POST /api/incidents — Create a new incident. */
export const POST = withAuth(async (request, user) => {
  const body = (await request.json()) as Record<string, unknown>;

  if (!body.projectId || !body.title || !body.severity) {
    return NextResponse.json(
      { error: "projectId, title, and severity are required" },
      { status: 400 },
    );
  }

  const incident = await createIncident({
    projectId: String(body.projectId),
    title: String(body.title),
    severity: String(body.severity),
    createdBy: user.id,
  });

  await logAudit({
    actorId: user.id,
    action: "incident.create",
    targetType: "incident",
    targetId: incident.id,
    request,
  });

  return NextResponse.json(incident, { status: 201 });
});

/**
 * Postmortem API route for an incident.
 *
 * POST generates a template-based postmortem draft from incident data.
 * PUT saves (or updates) the postmortem content on the incident record.
 *
 * POST /api/incidents/:id/postmortem
 * PUT  /api/incidents/:id/postmortem
 */

import { NextResponse } from "next/server";
import { withAuthContext } from "@/lib/auth/guards";
import { logAudit } from "@/lib/auth/audit";
import {
  generatePostmortemDraft,
  savePostmortem,
} from "@/lib/incidents/postmortem";

/** POST /api/incidents/:id/postmortem — Generate a postmortem draft. */
export const POST = withAuthContext(async (_request, user, context) => {
  const { id } = await context.params;

  const draft = await generatePostmortemDraft(id);

  await logAudit({
    actorId: user.id,
    action: "postmortem.generate",
    targetType: "incident",
    targetId: id,
  });

  return NextResponse.json({ content: draft }, { status: 201 });
});

/** PUT /api/incidents/:id/postmortem — Save postmortem content. */
export const PUT = withAuthContext(async (request, user, context) => {
  const { id } = await context.params;
  const body = (await request.json()) as { content?: string };

  if (!body.content) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 },
    );
  }

  await savePostmortem(id, body.content);

  await logAudit({
    actorId: user.id,
    action: "postmortem.save",
    targetType: "incident",
    targetId: id,
  });

  return NextResponse.json({ saved: true });
});

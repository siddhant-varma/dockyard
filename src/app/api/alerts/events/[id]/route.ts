import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { alertEvents } from "@/db/schema";
import { withAuthContext } from "@/lib/auth/guards";
import { logAudit } from "@/lib/auth/audit";

/** PUT /api/alerts/events/:id — Update alert event status (acknowledge or resolve). */
export const PUT = withAuthContext(async (request, user, context) => {
  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;

  const newStatus = body.status;
  if (newStatus !== "acknowledged" && newStatus !== "resolved") {
    return NextResponse.json(
      { error: "status must be 'acknowledged' or 'resolved'" },
      { status: 400 },
    );
  }

  const existing = await db.query.alertEvents.findFirst({
    where: eq(alertEvents.id, id),
  });

  if (!existing) {
    return NextResponse.json({ error: "Alert event not found" }, { status: 404 });
  }

  const now = new Date();
  const updates: Record<string, unknown> = { status: newStatus };

  if (newStatus === "acknowledged") {
    updates.acknowledgedAt = now;
    updates.acknowledgedBy = user.id;
  } else if (newStatus === "resolved") {
    updates.resolvedAt = now;
    updates.resolvedBy = user.id;
    // Also set acknowledged fields if not already set
    if (!existing.acknowledgedAt) {
      updates.acknowledgedAt = now;
      updates.acknowledgedBy = user.id;
    }
  }

  const [updated] = await db
    .update(alertEvents)
    .set(updates)
    .where(eq(alertEvents.id, id))
    .returning();

  await logAudit({
    actorId: user.id,
    action: `alert_event.${newStatus}`,
    targetType: "alert_event",
    targetId: id,
    diff: { status: newStatus },
    request,
  });

  return NextResponse.json(updated);
});

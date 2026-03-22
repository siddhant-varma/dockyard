import { NextResponse } from "next/server";
import { withAuthContext } from "@/lib/auth/guards";
import { logAudit } from "@/lib/auth/audit";

/**
 * POST /api/hetzner/servers/:id/actions/reset — Trigger a hard reset on a Hetzner server.
 *
 * Proxies the Hetzner Cloud API POST /servers/{id}/actions/reset endpoint.
 * Requires authentication and logs the action to the audit trail.
 */
export const POST = withAuthContext(async (request, user, context) => {
  const { id } = await context.params;

  const token = process.env.HETZNER_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Hetzner API not configured" },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(
      `https://api.hetzner.cloud/v1/servers/${id}/actions/reset`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Hetzner API error: ${res.status}`, detail: body },
        { status: res.status }
      );
    }

    const data = await res.json();

    await logAudit({
      actorId: user.id,
      action: "server.reset",
      targetType: "hetzner_server",
      targetId: id,
      diff: { actionId: data.action?.id },
      request,
    });

    return NextResponse.json({
      success: true,
      actionId: data.action?.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
});

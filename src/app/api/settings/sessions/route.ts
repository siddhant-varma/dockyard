/**
 * Session management API endpoint.
 *
 * POST /api/settings/sessions/revoke — Force-revoke sessions.
 * Requires superadmin role. Accepts a JSON body specifying the scope:
 * - `{ scope: "all" }` — Revoke all sessions for all users
 * - `{ scope: "user", userId: "..." }` — Revoke sessions for a specific user
 *
 * After revocation, affected users' JWT tokens will be rejected on
 * the next request (checked in the JWT callback with ~30s cache delay).
 */

import { withAuth } from "@/lib/auth/guards";
import { logAudit } from "@/lib/auth/audit";
import {
  revokeAllSessions,
  revokeUserSessions,
} from "@/lib/auth/session-revocation";
import { apiSuccess, apiError } from "@/lib/api/response";

/** Request body shape for session revocation. */
interface RevokeRequest {
  scope: "all" | "user";
  userId?: string;
}

export const POST = withAuth(
  async (request, user) => {
    let body: RevokeRequest;
    try {
      body = (await request.json()) as RevokeRequest;
    } catch {
      return apiError("BAD_REQUEST", "Invalid JSON body", 400);
    }

    if (body.scope !== "all" && body.scope !== "user") {
      return apiError("BAD_REQUEST", 'scope must be "all" or "user"', 400);
    }

    if (body.scope === "user" && !body.userId) {
      return apiError(
        "BAD_REQUEST",
        'userId is required when scope is "user"',
        400
      );
    }

    if (body.scope === "all") {
      await revokeAllSessions("admin_force_logout");
      await logAudit({
        actorId: user.id,
        action: "session.revoke_all",
        targetType: "session",
        request,
      }).catch(() => {});
    } else {
      // userId is guaranteed by the validation above
      const targetUserId = body.userId as string;
      await revokeUserSessions(targetUserId, "admin_force_logout");
      await logAudit({
        actorId: user.id,
        action: "session.revoke_user",
        targetType: "session",
        targetId: body.userId,
        request,
      }).catch(() => {});
    }

    return apiSuccess({
      revoked: true,
      scope: body.scope,
      userId: body.scope === "user" ? body.userId : undefined,
    });
  },
  { role: "superadmin" }
);

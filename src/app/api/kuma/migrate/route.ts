/**
 * POST /api/kuma/migrate — Switch a project's monitoring source.
 *
 * Handles migration from internal health checks to Uptime Kuma monitoring
 * (or vice versa). Updates the project's `monitoringSource` field in the
 * database.
 *
 * Request body:
 * ```json
 * {
 *   "projectId": "uuid-of-project",
 *   "source": "internal" | "kuma" | "both"
 * }
 * ```
 *
 * Requires superadmin role.
 */

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/connection";
import { projects } from "@/db/schema";
import { withAuth } from "@/lib/auth/guards";
import { apiSuccess, apiError } from "@/lib/api/response";
import { logAudit } from "@/lib/auth/audit";

const migrateSchema = z.object({
  projectId: z.string().uuid(),
  source: z.enum(["internal", "kuma", "both"]),
});

/**
 * POST handler — switch a project's monitoring source between
 * internal health checks and Uptime Kuma.
 */
export const POST = withAuth(
  async (request, user) => {
    const body = await request.json().catch(() => null);
    const parsed = migrateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.issues.map((i) => i.message).join(", "),
        400
      );
    }

    const { projectId, source } = parsed.data;

    // Verify project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return apiError("NOT_FOUND", "Project not found", 404);
    }

    const previousSource = project.monitoringSource;

    // Update the monitoring source
    await db
      .update(projects)
      .set({
        monitoringSource: source,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    // Audit log the migration
    logAudit({
      actorId: user.id,
      action: "monitoring.migrate",
      targetType: "project",
      targetId: projectId,
      diff: { from: previousSource, to: source },
      request,
    });

    return apiSuccess({
      projectId,
      previousSource,
      newSource: source,
      message: `Monitoring source changed from "${previousSource}" to "${source}"`,
    });
  },
  { role: "superadmin" }
);

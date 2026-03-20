import { NextResponse } from "next/server";
import {
  getProject,
  updateProject,
  deleteProject,
} from "@/lib/projects/service";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/auth/audit";

/** GET /api/projects/:slug — Project detail. */
export const GET = withAuthContext(async (_request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "read");
  const project = await getProject(slug);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(project);
});

/** PUT /api/projects/:slug — Update project (requires project admin). */
export const PUT = withAuthContext(async (request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "config.write");
  const body = (await request.json()) as Record<string, unknown>;

  try {
    const updated = await updateProject(slug, body);
    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await logAudit({
      actorId: user.id,
      action: "project.update",
      targetType: "project",
      targetId: updated.id,
      request,
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});

/** DELETE /api/projects/:slug — Archive project (superadmin only). */
export const DELETE = withAuthContext(
  async (request, user, context) => {
    const { slug } = await context.params;
    const archived = await deleteProject(slug);
    if (!archived) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await logAudit({
      actorId: user.id,
      action: "project.delete",
      targetType: "project",
      targetId: slug,
      request,
    });

    return NextResponse.json({ archived: true });
  },
  { role: "superadmin" }
);

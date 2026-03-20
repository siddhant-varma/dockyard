/**
 * Config template management API routes.
 *
 * CRUD for config templates + apply/save-as-template operations.
 * Requires project_admin or superadmin role for write operations.
 */

import { NextResponse } from "next/server";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission, resolveProjectId } from "@/lib/auth/permissions";
import {
  createTemplate,
  listTemplates,
  applyTemplate,
  saveAsTemplate,
  deleteTemplate,
  type CreateTemplateInput,
} from "@/lib/config/templates";
import { logAudit } from "@/lib/auth/audit";

/** GET /api/projects/:slug/config/templates — List templates. */
export const GET = withAuthContext(async (_request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "read");

  const projectId = await resolveProjectId(slug);
  const templates = await listTemplates(projectId);

  return NextResponse.json(templates);
});

/** POST /api/projects/:slug/config/templates — Create or apply template. */
export const POST = withAuthContext(async (request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "config.write");

  const projectId = await resolveProjectId(slug);
  const body = (await request.json()) as Record<string, unknown>;

  if (body.action === "apply" && typeof body.templateId === "string") {
    const result = await applyTemplate(projectId, body.templateId, user.id);

    await logAudit({
      actorId: user.id,
      action: "config_template.apply",
      targetType: "config_template",
      targetId: body.templateId,
      request,
    });

    return NextResponse.json(result);
  }

  if (body.action === "save_current" && typeof body.name === "string") {
    const template = await saveAsTemplate(projectId, body.name, user.id);

    await logAudit({
      actorId: user.id,
      action: "config_template.save",
      targetType: "config_template",
      targetId: template.id,
      request,
    });

    return NextResponse.json(template, { status: 201 });
  }

  const input = body as unknown as CreateTemplateInput;
  if (!input.name || !input.entries) {
    return NextResponse.json(
      { error: "name and entries are required" },
      { status: 400 }
    );
  }

  const template = await createTemplate(projectId, input, user.id);

  await logAudit({
    actorId: user.id,
    action: "config_template.create",
    targetType: "config_template",
    targetId: template.id,
    request,
  });

  return NextResponse.json(template, { status: 201 });
});

/** DELETE /api/projects/:slug/config/templates — Remove a template. */
export const DELETE = withAuthContext(async (request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "config.write");

  const body = (await request.json()) as { id: string };
  if (!body.id) {
    return NextResponse.json({ error: "Template id is required" }, { status: 400 });
  }

  const deleted = await deleteTemplate(body.id);
  if (!deleted) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await logAudit({
    actorId: user.id,
    action: "config_template.delete",
    targetType: "config_template",
    targetId: body.id,
    request,
  });

  return NextResponse.json({ deleted: true });
});

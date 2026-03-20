/**
 * Context handoff block API for a project.
 *
 * Generates structured snapshots for AI coding agents.
 * Supports JSON and Markdown formats.
 */

import { NextResponse } from "next/server";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission, resolveProjectId } from "@/lib/auth/permissions";
import { generateHandoffBlock, type HandoffFormat } from "@/lib/ai/context-handoff";

/** GET /api/projects/:slug/handoff?format=json|markdown */
export const GET = withAuthContext(async (request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "read");

  const projectId = await resolveProjectId(slug);
  const sp = new URL(request.url).searchParams;
  const format = (sp.get("format") ?? "json") as HandoffFormat;

  const content = await generateHandoffBlock(projectId, format);

  if (format === "markdown") {
    return new NextResponse(content, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }

  return NextResponse.json(JSON.parse(content));
});

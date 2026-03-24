/**
 * Kuma monitor management API routes for a project.
 *
 * GET: List all Uptime Kuma monitors linked to a project.
 * Returns monitor details including type, URL, status, and polling interval.
 *
 * Requires read permission on the project.
 */

import { NextResponse } from "next/server";
import { withAuthContext } from "@/lib/auth/guards";
import {
  requireProjectPermission,
  resolveProjectId,
} from "@/lib/auth/permissions";
import { getProjectMonitors } from "@/lib/kuma/provisioner";

/** GET /api/projects/:slug/monitors — List Kuma monitors for a project. */
export const GET = withAuthContext(async (_request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "read");

  const projectId = await resolveProjectId(slug);
  const monitors = await getProjectMonitors(projectId);

  return NextResponse.json({ monitors });
});

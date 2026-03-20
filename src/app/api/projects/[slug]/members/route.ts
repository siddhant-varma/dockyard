/**
 * Project membership management API.
 *
 * Manages per-project role assignments (admin/viewer) for users.
 * Only superadmins can add, update, or remove project members.
 * Any authenticated user with project read access can list members.
 */

import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/connection";
import { projects, projectMemberships, users } from "@/db/schema";
import { withAuthContext } from "@/lib/auth/guards";
import { requireRole } from "@/lib/auth/rbac";
import { requireProjectPermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/auth/audit";

/** Resolve a project by slug or return 404. */
async function resolveProject(slug: string) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, slug),
    columns: { id: true, name: true },
  });
  if (!project) {
    return null;
  }
  return project;
}

/** GET /api/projects/:slug/members — List project members with roles. */
export const GET = withAuthContext(async (_request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "read");

  const project = await resolveProject(slug);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const memberships = await db
    .select({
      id: projectMemberships.id,
      userId: projectMemberships.userId,
      role: projectMemberships.role,
      createdAt: projectMemberships.createdAt,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
    })
    .from(projectMemberships)
    .innerJoin(users, eq(projectMemberships.userId, users.id))
    .where(eq(projectMemberships.projectId, project.id));

  return NextResponse.json(memberships);
});

const addMemberSchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
  role: z.enum(["admin", "viewer"]),
});

/** POST /api/projects/:slug/members — Add a member (superadmin only). */
export const POST = withAuthContext(async (request, user, context) => {
  requireRole(user, "superadmin");
  const { slug } = await context.params;

  const project = await resolveProject(slug);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, parsed.data.userId),
    columns: { id: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const [membership] = await db
      .insert(projectMemberships)
      .values({
        userId: parsed.data.userId,
        projectId: project.id,
        role: parsed.data.role,
        grantedBy: user.id,
      })
      .returning();

    await logAudit({
      actorId: user.id,
      action: "membership.create",
      targetType: "project_membership",
      targetId: membership.id,
      request,
    });

    return NextResponse.json(membership, { status: 201 });
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes("uq_user_project")
    ) {
      return NextResponse.json(
        { error: "User is already a member of this project" },
        { status: 409 }
      );
    }
    throw err;
  }
});

const updateRoleSchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
  role: z.enum(["admin", "viewer"]),
});

/** PUT /api/projects/:slug/members — Update a member's role (superadmin only). */
export const PUT = withAuthContext(async (request, user, context) => {
  requireRole(user, "superadmin");
  const { slug } = await context.params;

  const project = await resolveProject(slug);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(projectMemberships)
    .set({ role: parsed.data.role })
    .where(
      and(
        eq(projectMemberships.projectId, project.id),
        eq(projectMemberships.userId, parsed.data.userId)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Membership not found" },
      { status: 404 }
    );
  }

  await logAudit({
    actorId: user.id,
    action: "membership.update",
    targetType: "project_membership",
    targetId: updated.id,
    request,
  });

  return NextResponse.json(updated);
});

const deleteMemberSchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
});

/** DELETE /api/projects/:slug/members — Remove a member (superadmin only). */
export const DELETE = withAuthContext(async (request, user, context) => {
  requireRole(user, "superadmin");
  const { slug } = await context.params;

  const project = await resolveProject(slug);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = deleteMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const [deleted] = await db
    .delete(projectMemberships)
    .where(
      and(
        eq(projectMemberships.projectId, project.id),
        eq(projectMemberships.userId, parsed.data.userId)
      )
    )
    .returning();

  if (!deleted) {
    return NextResponse.json(
      { error: "Membership not found" },
      { status: 404 }
    );
  }

  await logAudit({
    actorId: user.id,
    action: "membership.delete",
    targetType: "project_membership",
    targetId: deleted.id,
    request,
  });

  return NextResponse.json({ removed: true });
});

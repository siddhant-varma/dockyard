/**
 * Project-scoped permission checker for DockYard.
 *
 * Resolves a user's effective permissions for a specific project by checking:
 * 1. Superadmin role — universal access to all projects
 * 2. Project membership — per-project admin or viewer role
 * 3. Global viewer — read-only access to all projects
 *
 * @example
 * ```ts
 * const canDeploy = await checkProjectPermission(userId, projectId, "deploy");
 * if (!canDeploy) throw new ApiError("FORBIDDEN", "Insufficient permissions");
 * ```
 */

import { eq, and } from "drizzle-orm";
import { db } from "@/db/connection";
import { users, projectMemberships, projects } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";

/** Actions that can be checked against project-scoped permissions. */
export type ProjectAction =
  | "read"
  | "config.write"
  | "deploy"
  | "alert.manage"
  | "test.run";

/** Actions permitted for each project membership role. */
const ROLE_ACTIONS: Record<string, ProjectAction[]> = {
  admin: ["read", "config.write", "deploy", "alert.manage", "test.run"],
  viewer: ["read"],
};

/**
 * Check if a user has permission to perform an action on a project.
 *
 * Resolution order:
 * 1. Superadmin users always have all permissions
 * 2. Users with a project membership get permissions based on their project role
 * 3. Global viewers get read-only access to all projects
 *
 * @param userId - The user's database ID
 * @param projectId - The project's database ID
 * @param action - The action to check permission for
 * @returns True if the user has permission
 */
export async function checkProjectPermission(
  userId: string,
  projectId: string,
  action: ProjectAction
): Promise<boolean> {
  if (userId === "anonymous") {
    return true;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return false;
  }

  if (user.role === "superadmin") {
    return true;
  }

  const membership = await db.query.projectMemberships.findFirst({
    where: and(
      eq(projectMemberships.userId, userId),
      eq(projectMemberships.projectId, projectId)
    ),
  });

  if (membership) {
    const allowed = ROLE_ACTIONS[membership.role] ?? [];
    return allowed.includes(action);
  }

  if (user.role === "viewer" && action === "read") {
    return true;
  }

  return false;
}

/**
 * Resolve a project ID from its slug.
 *
 * @param slug - The project's URL-safe slug
 * @returns The project's database ID
 * @throws ApiError with NOT_FOUND if the slug doesn't match any project
 */
export async function resolveProjectId(slug: string): Promise<string> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, slug),
    columns: { id: true },
  });

  if (!project) {
    throw new ApiError("NOT_FOUND", `Project "${slug}" not found`);
  }

  return project.id;
}

/**
 * Require a specific project permission. Throws 403 if denied.
 *
 * Convenience wrapper that combines slug resolution + permission check.
 * Designed for use in API route handlers after authentication.
 *
 * @param userId - The authenticated user's ID
 * @param projectSlug - The project's URL slug (from route params)
 * @param action - The action to authorize
 * @throws ApiError FORBIDDEN if the user lacks the required permission
 * @throws ApiError NOT_FOUND if the project slug doesn't exist
 */
export async function requireProjectPermission(
  userId: string,
  projectSlug: string,
  action: ProjectAction
): Promise<void> {
  const projectId = await resolveProjectId(projectSlug);
  const allowed = await checkProjectPermission(userId, projectId, action);

  if (!allowed) {
    throw new ApiError(
      "FORBIDDEN",
      `You do not have "${action}" permission for this project`
    );
  }
}

/**
 * Project CRUD service.
 *
 * Handles project lifecycle management: create, read, update, delete (archive).
 * All business logic for project state transitions lives here — API routes
 * and components call these functions, never query the DB directly.
 */

import { and, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/db/connection";
import { projects } from "@/db/schema";

/** Filters for listing projects. */
export interface ProjectFilters {
  status?: string;
  publicOnly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

/** Data for creating a new project. */
export interface CreateProjectData {
  name: string;
  slug: string;
  description?: string;
  status?: string;
  currentPhase?: string;
  publicVisible?: boolean;
  githubRepo?: string;
  dokployAppId?: string;
  dokployType?: "application" | "compose";
  localPath?: string;
  techStack?: string[];
  discoveredVia?: string;
}

/** Valid lifecycle state transitions. */
const VALID_TRANSITIONS: Record<string, string[]> = {
  discovered: ["discovery", "active", "archived"],
  discovery: ["active", "paused", "archived"],
  active: ["paused", "completed", "archived"],
  paused: ["active", "archived"],
  completed: ["archived", "active"],
  archived: ["active"],
};

/**
 * List projects with optional filters.
 */
export async function listProjects(filters: ProjectFilters = {}) {
  const conditions = [];

  if (filters.status) {
    conditions.push(
      eq(
        projects.status,
        filters.status as (typeof projects.status.enumValues)[number]
      )
    );
  }
  if (filters.publicOnly) {
    conditions.push(eq(projects.publicVisible, true));
  }
  if (filters.search) {
    conditions.push(ilike(projects.name, `%${filters.search}%`));
  }

  const query = db
    .select()
    .from(projects)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(projects.name)
    .limit(filters.limit ?? 100)
    .offset(filters.offset ?? 0);

  return query;
}

/**
 * Get a single project by slug.
 */
export async function getProject(slug: string) {
  return db.query.projects.findFirst({
    where: eq(projects.slug, slug),
  });
}

/**
 * Create a new project.
 */
export async function createProject(data: CreateProjectData) {
  const [created] = await db
    .insert(projects)
    .values({
      name: data.name,
      slug: data.slug,
      description: data.description,
      status:
        (data.status as (typeof projects.status.enumValues)[number]) ??
        "discovered",
      currentPhase: data.currentPhase,
      publicVisible: data.publicVisible ?? false,
      githubRepo: data.githubRepo,
      dokployAppId: data.dokployAppId,
      dokployType: data.dokployType,
      localPath: data.localPath,
      techStack: data.techStack,
      discoveredVia: data.discoveredVia ?? "manual",
    })
    .returning();
  return created;
}

/**
 * Update a project by slug. Validates lifecycle state transitions.
 */
export async function updateProject(
  slug: string,
  data: Partial<CreateProjectData>
) {
  const existing = await getProject(slug);
  if (!existing) return null;

  // Validate state transition if status is being changed
  if (data.status && data.status !== existing.status) {
    const allowed = VALID_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(data.status)) {
      throw new Error(
        `Invalid state transition: ${existing.status} → ${data.status}`
      );
    }
  }

  const [updated] = await db
    .update(projects)
    .set({
      ...data,
      status: data.status as
        | (typeof projects.status.enumValues)[number]
        | undefined,
      dokployType: data.dokployType,
      updatedAt: new Date(),
    })
    .where(eq(projects.slug, slug))
    .returning();

  return updated;
}

/**
 * Soft-delete a project by archiving it.
 */
export async function deleteProject(slug: string) {
  return updateProject(slug, { status: "archived" });
}

/**
 * Count projects by status.
 */
export async function countProjectsByStatus() {
  const rows = await db
    .select({
      status: projects.status,
      count: sql<number>`count(*)`,
    })
    .from(projects)
    .groupBy(projects.status);

  return Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
}

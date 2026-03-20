/**
 * Config template CRUD service for DockYard.
 *
 * Manages config profiles (dev/staging/prod) that can be applied to
 * bulk-update a project's configuration entries. Applying a template
 * creates audit log entries for each change.
 */

import { eq, and } from "drizzle-orm";
import { db } from "@/db/connection";
import { configTemplates } from "@/db/schema";
import { getConfigEntries, upsertConfigEntry } from "./service";

/** A single entry within a config template. */
export interface TemplateEntry {
  key: string;
  value: string;
  category?: string;
}

/** Data required to create a config template. */
export interface CreateTemplateInput {
  name: string;
  description?: string;
  entries: TemplateEntry[];
  isDefault?: boolean;
}

/**
 * Create a new config template for a project.
 *
 * @param projectId - The project's database ID
 * @param input - Template name, description, and entries
 * @param userId - The creating user's ID (for audit)
 * @returns The newly created template record
 */
export async function createTemplate(
  projectId: string,
  input: CreateTemplateInput,
  userId?: string
) {
  const [template] = await db
    .insert(configTemplates)
    .values({
      projectId,
      name: input.name,
      description: input.description,
      entries: input.entries,
      isDefault: input.isDefault ?? false,
      createdBy: userId,
    })
    .returning();

  return template;
}

/**
 * List all config templates for a project.
 *
 * @param projectId - The project's database ID
 * @returns Array of template records
 */
export async function listTemplates(projectId: string) {
  return db.query.configTemplates.findMany({
    where: eq(configTemplates.projectId, projectId),
    orderBy: (t, { asc }) => [asc(t.name)],
  });
}

/**
 * Apply a template to a project's configuration.
 *
 * Reads the template's entries and bulk-updates the project's config,
 * creating audit log entries for each change. Returns a diff of changes.
 *
 * @param projectId - The project's database ID
 * @param templateId - The template to apply
 * @param userId - The applying user's ID (for audit)
 * @returns Diff showing what changed
 */
export async function applyTemplate(
  projectId: string,
  templateId: string,
  userId?: string
): Promise<{ applied: number; diff: Array<{ key: string; action: string }> }> {
  const template = await db.query.configTemplates.findFirst({
    where: and(
      eq(configTemplates.id, templateId),
      eq(configTemplates.projectId, projectId)
    ),
  });

  if (!template) {
    throw new Error("Template not found");
  }

  const entries = template.entries as TemplateEntry[];
  const diff: Array<{ key: string; action: string }> = [];

  for (const entry of entries) {
    const existingEntries = await getConfigEntries(projectId);
    const existing = existingEntries.find((e) => e.key === entry.key);

    await upsertConfigEntry(projectId, entry.key, entry.value, {
      category: entry.category,
      changeReason: `Applied template: ${template.name}`,
      changedBy: userId,
    });

    diff.push({
      key: entry.key,
      action: existing ? "updated" : "created",
    });
  }

  return { applied: diff.length, diff };
}

/**
 * Save the current project configuration as a new template.
 *
 * @param projectId - The project's database ID
 * @param name - Name for the new template
 * @param userId - The creating user's ID
 * @returns The newly created template
 */
export async function saveAsTemplate(
  projectId: string,
  name: string,
  userId?: string
) {
  const currentEntries = await getConfigEntries(projectId);

  const templateEntries: TemplateEntry[] = currentEntries.map((e) => ({
    key: e.key,
    value: e.value ?? "",
    category: e.category ?? undefined,
  }));

  return createTemplate(
    projectId,
    { name, entries: templateEntries },
    userId
  );
}

/**
 * Delete a config template.
 *
 * @param id - The template's database ID
 * @returns True if deleted, false if not found
 */
export async function deleteTemplate(id: string): Promise<boolean> {
  const [deleted] = await db
    .delete(configTemplates)
    .where(eq(configTemplates.id, id))
    .returning({ id: configTemplates.id });

  return !!deleted;
}

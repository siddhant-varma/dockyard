/**
 * Config category management for DockYard.
 *
 * Provides logical grouping of config entries by category (e.g., database,
 * auth, monitoring). Categories affect how entries are displayed and
 * organized in the config panel.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "@/db/connection";
import { configEntries } from "@/db/schema";

/** Predefined config categories with display metadata. */
export const PREDEFINED_CATEGORIES = [
  { key: "general", label: "General", icon: "settings" },
  { key: "database", label: "Database", icon: "database" },
  { key: "ai_provider", label: "AI Provider", icon: "sparkles" },
  { key: "auth", label: "Authentication", icon: "lock" },
  { key: "storage", label: "Storage", icon: "folder" },
  { key: "monitoring", label: "Monitoring", icon: "activity" },
  { key: "custom", label: "Custom", icon: "tag" },
] as const;

/** A category with its entry count for a project. */
export interface CategorySummary {
  category: string;
  label: string;
  icon: string;
  count: number;
}

/**
 * Get all categories used by a project's config entries with counts.
 *
 * Returns both predefined categories that have entries and any custom
 * categories found. Entries without a category are grouped as "Uncategorized".
 *
 * @param projectId - The project's database ID
 * @returns Array of categories with entry counts
 */
export async function getCategoriesForProject(
  projectId: string
): Promise<CategorySummary[]> {
  const rows = await db
    .select({
      category: configEntries.category,
      count: sql<number>`count(*)`,
    })
    .from(configEntries)
    .where(eq(configEntries.projectId, projectId))
    .groupBy(configEntries.category);

  return rows.map((row) => {
    const catKey = row.category ?? "uncategorized";
    const predefined = PREDEFINED_CATEGORIES.find((c) => c.key === catKey);
    return {
      category: catKey,
      label: predefined?.label ?? catKey,
      icon: predefined?.icon ?? "tag",
      count: Number(row.count),
    };
  });
}

/**
 * Update the category of a config entry.
 *
 * @param entryId - The config entry's database ID
 * @param category - The new category key
 * @returns True if updated, false if entry not found
 */
export async function setEntryCategory(
  entryId: string,
  category: string
): Promise<boolean> {
  const [updated] = await db
    .update(configEntries)
    .set({ category })
    .where(eq(configEntries.id, entryId))
    .returning({ id: configEntries.id });

  return !!updated;
}

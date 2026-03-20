/**
 * Discovery scanner orchestrator.
 *
 * Runs all enabled discovery sources, merges discovered projects by slug,
 * deduplicates, and upserts to the projects table. Emits a "project.discovered"
 * signal event for newly found projects.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { discoverySources, projects } from "@/db/schema";
import type {
  DiscoveredProject,
  DiscoverySource,
  DiscoverySourceType,
  ScanResult,
} from "./types";

/** Registry of available discovery source implementations. */
const sourceRegistry = new Map<DiscoverySourceType, DiscoverySource>();

/**
 * Register a discovery source implementation.
 * Called at startup or when new source types are added.
 */
export function registerSource(source: DiscoverySource): void {
  sourceRegistry.set(source.type, source);
}

/**
 * Run all enabled discovery sources and merge results into the database.
 *
 * @returns Summary of what was found, created, and updated
 */
export async function scanAll(): Promise<ScanResult> {
  const enabledSources = await db.query.discoverySources.findMany({
    where: eq(discoverySources.enabled, true),
  });

  const allDiscovered: DiscoveredProject[] = [];
  const sourceSummaries: ScanResult["sources"] = [];

  for (const source of enabledSources) {
    const impl = sourceRegistry.get(source.type);
    if (!impl) {
      sourceSummaries.push({
        type: source.type,
        name: source.name,
        found: 0,
        error: `No implementation registered for source type: ${source.type}`,
      });
      continue;
    }

    try {
      const config = source.config as Record<string, unknown>;
      const discovered = await impl.scan(config);
      allDiscovered.push(...discovered);
      sourceSummaries.push({
        type: source.type,
        name: source.name,
        found: discovered.length,
      });

      await db
        .update(discoverySources)
        .set({
          lastScanAt: new Date(),
          lastScanResult: { found: discovered.length },
          updatedAt: new Date(),
        })
        .where(eq(discoverySources.id, source.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      sourceSummaries.push({
        type: source.type,
        name: source.name,
        found: 0,
        error: message,
      });
    }
  }

  const merged = mergeBySlug(allDiscovered);
  const { created, updated } = await upsertProjects(merged);

  return {
    found: merged.length,
    created,
    updated,
    sources: sourceSummaries,
  };
}

/**
 * Run a single discovery source by its database ID.
 *
 * @param sourceId - UUID of the discovery_sources record
 * @returns Array of discovered projects
 */
export async function scanSource(
  sourceId: string
): Promise<DiscoveredProject[]> {
  const source = await db.query.discoverySources.findFirst({
    where: eq(discoverySources.id, sourceId),
  });

  if (!source) {
    throw new Error(`Discovery source not found: ${sourceId}`);
  }

  const impl = sourceRegistry.get(source.type);
  if (!impl) {
    throw new Error(
      `No implementation registered for source type: ${source.type}`
    );
  }

  const config = source.config as Record<string, unknown>;
  return impl.scan(config);
}

/**
 * Merge discovered projects by slug.
 * When the same slug is found by multiple sources, later sources' fields
 * are merged in (non-null fields take precedence).
 */
function mergeBySlug(discovered: DiscoveredProject[]): DiscoveredProject[] {
  const bySlug = new Map<string, DiscoveredProject>();

  for (const project of discovered) {
    const existing = bySlug.get(project.slug);
    if (!existing) {
      bySlug.set(project.slug, { ...project });
    } else {
      bySlug.set(project.slug, {
        ...existing,
        ...stripUndefined(project),
        techStack: mergeTechStack(existing.techStack, project.techStack),
      });
    }
  }

  return [...bySlug.values()];
}

/**
 * Upsert discovered projects into the database.
 * New slugs → INSERT with status "discovered".
 * Existing slugs → UPDATE metadata fields only (don't overwrite user edits).
 */
async function upsertProjects(
  discovered: DiscoveredProject[]
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const project of discovered) {
    const existing = await db.query.projects.findFirst({
      where: eq(projects.slug, project.slug),
    });

    if (!existing) {
      await db.insert(projects).values({
        name: project.name,
        slug: project.slug,
        description: project.description,
        status: "discovered",
        techStack: project.techStack,
        localPath: project.localPath,
        githubRepo: project.githubRepo,
        dokployAppId: project.dokployAppId,
        dokployType: project.dokployType,
        discoveredVia: project.source,
      });
      created++;
    } else {
      await db
        .update(projects)
        .set({
          localPath: project.localPath ?? existing.localPath,
          githubRepo: project.githubRepo ?? existing.githubRepo,
          dokployAppId: project.dokployAppId ?? existing.dokployAppId,
          techStack: project.techStack ?? existing.techStack,
          discoveredVia: project.source,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, existing.id));
      updated++;
    }
  }

  return { created, updated };
}

/** Remove undefined values from an object so they don't overwrite existing fields. */
function stripUndefined(obj: DiscoveredProject): Partial<DiscoveredProject> {
  const result: Partial<DiscoveredProject> = {};
  for (const key of Object.keys(obj) as Array<keyof DiscoveredProject>) {
    if (obj[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[key] = obj[key];
    }
  }
  return result;
}

/** Merge two tech stack arrays, deduplicating. */
function mergeTechStack(a?: string[], b?: string[]): string[] | undefined {
  if (!a && !b) return undefined;
  return [...new Set([...(a ?? []), ...(b ?? [])])];
}

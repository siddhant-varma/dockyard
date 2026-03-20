/**
 * Health endpoint URL resolver.
 *
 * Resolves health check URLs for all active projects.
 * Uses in-memory cache with TTL to avoid repeated DB lookups.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { projects } from "@/db/schema";
import { getHealthEndpoint, type HealthEndpoint } from "./config";

/** Cached resolved endpoints. */
let cache: Map<string, HealthEndpoint | null> = new Map();
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Resolve health endpoints for all active projects.
 * Returns a map of projectId → HealthEndpoint.
 */
export async function resolveAllHealthUrls(): Promise<
  Map<string, HealthEndpoint>
> {
  if (Date.now() - cacheTimestamp < CACHE_TTL_MS && cache.size > 0) {
    const result = new Map<string, HealthEndpoint>();
    for (const [id, ep] of cache) {
      if (ep) result.set(id, ep);
    }
    return result;
  }

  const activeProjects = await db.query.projects.findMany({
    where: eq(projects.status, "active"),
  });

  const newCache = new Map<string, HealthEndpoint | null>();
  const result = new Map<string, HealthEndpoint>();

  for (const project of activeProjects) {
    const endpoint = await getHealthEndpoint(project.id);
    newCache.set(project.id, endpoint);
    if (endpoint) result.set(project.id, endpoint);
  }

  cache = newCache;
  cacheTimestamp = Date.now();

  return result;
}

/** Clear the resolver cache (used after project config changes). */
export function clearHealthUrlCache(): void {
  cache.clear();
  cacheTimestamp = 0;
}

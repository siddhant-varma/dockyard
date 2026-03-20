/**
 * Manual discovery source.
 *
 * Returns existing manually-registered projects from the database.
 * This ensures manual projects are included in scan results and
 * don't get marked as stale by the scanner.
 *
 * Unlike other sources, this doesn't "discover" new projects —
 * it preserves projects the user explicitly added.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { projects } from "@/db/schema";
import type { DiscoveredProject, DiscoverySource } from "../types";

export class ManualSource implements DiscoverySource {
  readonly type = "manual" as const;

  async scan(_config: Record<string, unknown>): Promise<DiscoveredProject[]> {
    const manualProjects = await db.query.projects.findMany({
      where: eq(projects.discoveredVia, "manual"),
    });

    return manualProjects.map((p) => ({
      name: p.name,
      slug: p.slug,
      description: p.description ?? undefined,
      techStack: p.techStack ?? undefined,
      localPath: p.localPath ?? undefined,
      githubRepo: p.githubRepo ?? undefined,
      dokployAppId: p.dokployAppId ?? undefined,
      dokployType: p.dokployType ?? undefined,
      source: "manual" as const,
    }));
  }
}

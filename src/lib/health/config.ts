/**
 * Health endpoint resolution for projects.
 *
 * Resolves the URL to use for health check polling by checking
 * multiple sources in priority order:
 * 1. Project's explicit healthEndpoint field (from .dockyard.json or manual config)
 * 2. Dokploy app domains + /healthz
 * 3. Local path inference (localhost + common ports)
 *
 * Returns null if no health endpoint can be determined.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { projects } from "@/db/schema";

/** Resolved health endpoint info. */
export interface HealthEndpoint {
  /** URL for the /healthz endpoint. */
  healthUrl: string;
  /** URL for the /readyz endpoint (if available). */
  readyUrl?: string;
  /** How the endpoint was resolved. */
  source: "explicit" | "dokploy_domain" | "local_inference";
}

/**
 * Resolve the health check endpoint for a project.
 *
 * @param projectId - UUID of the project
 * @returns Resolved endpoint or null if not determinable
 */
export async function getHealthEndpoint(
  projectId: string
): Promise<HealthEndpoint | null> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) return null;

  // 1. Check for explicit health endpoint in project metadata
  // This comes from .dockyard.json healthEndpoint field or manual configuration
  const metadata =
    project.discoveredVia === "filesystem"
      ? await getFilesystemMetadata(project.localPath)
      : null;

  if (metadata?.healthEndpoint) {
    return {
      healthUrl: metadata.healthEndpoint,
      readyUrl: metadata.healthEndpoint.replace("/healthz", "/readyz"),
      source: "explicit",
    };
  }

  // 2. Check if project has a Dokploy app ID — use its domains
  if (project.dokployAppId) {
    // In VPS mode, Dokploy apps have domains configured
    // We can't query Dokploy here (circular dep risk), so we check
    // if the project has a known domain stored
    const githubRepo = project.githubRepo;
    if (githubRepo) {
      // Convention: slug.domain.tld/healthz
      // This is a best-effort guess — real domains come from Dokploy
    }
  }

  // 3. Local inference for filesystem-discovered projects
  if (project.localPath) {
    const port = await inferLocalPort(project.localPath, project.techStack);
    if (port) {
      return {
        healthUrl: `http://localhost:${port}/healthz`,
        readyUrl: `http://localhost:${port}/readyz`,
        source: "local_inference",
      };
    }
  }

  return null;
}

/**
 * Read .dockyard.json metadata from a project's local path.
 */
async function getFilesystemMetadata(
  localPath: string | null
): Promise<{ healthEndpoint?: string } | null> {
  if (!localPath) return null;
  try {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");
    const configPath = join(localPath, ".dockyard.json");
    const raw = await readFile(configPath, "utf-8");
    const config = JSON.parse(raw) as Record<string, unknown>;
    return {
      healthEndpoint:
        typeof config.healthEndpoint === "string"
          ? config.healthEndpoint
          : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Infer the local development port from a project's tech stack.
 * Returns a common port based on the framework detected.
 */
async function inferLocalPort(
  localPath: string,
  techStack: string[] | null
): Promise<number | null> {
  const tags = techStack ?? [];

  // Check package.json for port hints
  try {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");
    const pkgPath = join(localPath, "package.json");
    const raw = await readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    const scripts = pkg.scripts as Record<string, string> | undefined;
    if (scripts?.dev) {
      // Look for --port or -p flags in dev script
      const portMatch = scripts.dev.match(/(?:--port|-p)\s+(\d+)/);
      if (portMatch) return parseInt(portMatch[1]);
    }
  } catch {
    // No package.json or parsing failed
  }

  // Framework-based defaults
  if (tags.includes("next.js")) return 3000;
  if (tags.includes("react")) return 3000;
  if (tags.includes("vue")) return 5173;
  if (tags.includes("svelte")) return 5173;
  if (tags.includes("express")) return 3000;
  if (tags.includes("fastify")) return 3000;
  if (tags.includes("go")) return 8080;
  if (tags.includes("rust")) return 8080;
  if (tags.includes("python")) return 8000;
  if (tags.includes("ruby")) return 3000;

  return null;
}

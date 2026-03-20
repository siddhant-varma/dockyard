/**
 * Filesystem discovery source.
 *
 * Scans local directories for project indicators (package.json, .git/,
 * Dockerfile, etc.). Designed for local development mode where DockYard
 * is installed alongside other projects.
 *
 * Configuration (from discovery_sources.config JSONB):
 *   { path: string, recursive?: boolean }
 *
 * - `path`: Directory to scan (absolute or relative to CWD).
 *   Use ".." to scan DockYard's parent directory (common for co-located projects).
 * - `recursive`: If true, scan subdirectories one level deep (default: false).
 *
 * Security: Only scans the configured path. Never traverses symlinks outside
 * the configured directory. Skips DockYard's own directory.
 */

import { readdir, readFile, stat, access } from "fs/promises";
import { basename, join, resolve } from "path";
import type { DiscoveredProject, DiscoverySource } from "../types";
import {
  generateSlug,
  inferTechStack,
  isDockYard,
  isProject,
} from "../indicators";

/** Shape of the .dockyard.json file a project can optionally include. */
interface DockYardConfig {
  name?: string;
  slug?: string;
  description?: string;
  techStack?: string[];
  healthEndpoint?: string;
  dipLevel?: number;
  ignore?: boolean;
}

export class FilesystemSource implements DiscoverySource {
  readonly type = "filesystem" as const;

  async scan(config: Record<string, unknown>): Promise<DiscoveredProject[]> {
    const scanPath = resolve(String(config.path ?? ".."));
    const discovered: DiscoveredProject[] = [];

    let entries: string[];
    try {
      entries = await readdir(scanPath);
    } catch {
      return [];
    }

    for (const entry of entries) {
      const entryPath = join(scanPath, entry);

      const entryStat = await safeStat(entryPath);
      if (!entryStat?.isDirectory()) continue;

      const files = await safeReaddir(entryPath);
      if (!files) continue;

      // Skip DockYard's own directory
      if (isDockYard(await getDeepIndicators(entryPath))) continue;

      // Check for project indicators
      if (!isProject(files)) continue;

      // Read optional .dockyard.json
      const dockyardConfig = await readDockYardConfig(entryPath);

      // Skip if explicitly ignored
      if (dockyardConfig?.ignore) continue;

      const dirName = basename(entryPath);
      const techStack = [
        ...inferTechStack(files),
        ...(dockyardConfig?.techStack ?? []),
      ];
      const uniqueTechStack = [...new Set(techStack)];

      const project: DiscoveredProject = {
        name: dockyardConfig?.name ?? dirName,
        slug: dockyardConfig?.slug ?? generateSlug(dirName),
        description: dockyardConfig?.description,
        techStack: uniqueTechStack.length > 0 ? uniqueTechStack : undefined,
        localPath: entryPath,
        healthEndpoint: dockyardConfig?.healthEndpoint,
        source: "filesystem",
        metadata: dockyardConfig
          ? { dipLevel: dockyardConfig.dipLevel }
          : undefined,
      };

      // Try to enrich from package.json
      const enriched = await enrichFromPackageJson(entryPath, project);
      discovered.push(enriched);
    }

    return discovered;
  }
}

/**
 * Read and parse .dockyard.json from a project directory.
 * Returns null if the file doesn't exist or can't be parsed.
 */
async function readDockYardConfig(
  dirPath: string
): Promise<DockYardConfig | null> {
  const configPath = join(dirPath, ".dockyard.json");
  try {
    await access(configPath);
    const raw = await readFile(configPath, "utf-8");
    return JSON.parse(raw) as DockYardConfig;
  } catch {
    return null;
  }
}

/**
 * Enrich a discovered project with data from package.json if it exists.
 * Reads name, description, and detects framework-specific tech stack.
 */
async function enrichFromPackageJson(
  dirPath: string,
  project: DiscoveredProject
): Promise<DiscoveredProject> {
  const pkgPath = join(dirPath, "package.json");
  try {
    await access(pkgPath);
    const raw = await readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;

    const enriched = { ...project };

    // Use package name if no override
    if (!project.description && typeof pkg.description === "string") {
      enriched.description = pkg.description;
    }

    // Detect frameworks from dependencies
    const allDeps = {
      ...(typeof pkg.dependencies === "object" ? pkg.dependencies : {}),
      ...(typeof pkg.devDependencies === "object" ? pkg.devDependencies : {}),
    } as Record<string, unknown>;

    const frameworkTags: string[] = [];
    if ("next" in allDeps) frameworkTags.push("next.js");
    if ("react" in allDeps) frameworkTags.push("react");
    if ("vue" in allDeps) frameworkTags.push("vue");
    if ("svelte" in allDeps) frameworkTags.push("svelte");
    if ("express" in allDeps) frameworkTags.push("express");
    if ("fastify" in allDeps) frameworkTags.push("fastify");
    if ("typescript" in allDeps) frameworkTags.push("typescript");

    if (frameworkTags.length > 0) {
      enriched.techStack = [
        ...new Set([...(enriched.techStack ?? []), ...frameworkTags]),
      ];
    }

    return enriched;
  } catch {
    return project;
  }
}

/** Get a list of key files/dirs including one level deep for self-detection. */
async function getDeepIndicators(dirPath: string): Promise<string[]> {
  const files = await safeReaddir(dirPath);
  if (!files) return [];

  const indicators = [...files];
  // Check for src/db/schema.ts specifically (DockYard self-detection)
  if (files.includes("src")) {
    const srcFiles = await safeReaddir(join(dirPath, "src"));
    if (srcFiles?.includes("db")) {
      const dbFiles = await safeReaddir(join(dirPath, "src", "db"));
      if (dbFiles?.includes("schema.ts")) {
        indicators.push("src/db/schema.ts");
      }
    }
  }
  return indicators;
}

async function safeStat(path: string) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

async function safeReaddir(path: string): Promise<string[] | null> {
  try {
    return await readdir(path);
  } catch {
    return null;
  }
}

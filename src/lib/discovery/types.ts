/**
 * Discovery engine types for DockYard.
 *
 * The discovery system auto-detects projects from multiple sources:
 * - Filesystem scanning (local dev mode)
 * - Dokploy API (VPS/deployed mode)
 * - GitHub API (both modes)
 * - Manual registration (both modes)
 *
 * Each source implements the DiscoverySource interface. The scanner
 * orchestrator runs all enabled sources, merges results, deduplicates,
 * and upserts to the projects table.
 */

/** Source types matching the discovery_source_type enum in the DB. */
export type DiscoverySourceType =
  | "filesystem"
  | "dokploy"
  | "github"
  | "manual";

/**
 * A project discovered by a source, before it's been merged or saved.
 * Each source produces an array of these from its scan.
 */
export interface DiscoveredProject {
  /** Human-readable name (e.g., "Project Alpha", "api-gateway"). */
  name: string;
  /** URL-safe slug for routing (e.g., "project-alpha", "api-gateway"). */
  slug: string;
  /** Short description, if available. */
  description?: string;
  /** Detected or declared tech stack tags. */
  techStack?: string[];
  /** Absolute path on local filesystem (local mode only). */
  localPath?: string;
  /** GitHub repository in "owner/repo" format. */
  githubRepo?: string;
  /** Dokploy application or compose ID. */
  dokployAppId?: string;
  /** Dokploy application type. */
  dokployType?: "application" | "compose";
  /** URL to the project's health endpoint. */
  healthEndpoint?: string;
  /** Which source discovered this project. */
  source: DiscoverySourceType;
  /** Extra metadata from .dockyard.json or provider API. */
  metadata?: Record<string, unknown>;
}

/**
 * Result of running the scanner across all sources.
 */
export interface ScanResult {
  /** Total projects found across all sources. */
  found: number;
  /** Projects newly inserted into the DB. */
  created: number;
  /** Projects that already existed and were updated. */
  updated: number;
  /** Per-source breakdown. */
  sources: Array<{
    type: DiscoverySourceType;
    name: string;
    found: number;
    error?: string;
  }>;
}

/**
 * Interface that all discovery sources must implement.
 * Sources are pluggable — add a new source by implementing this interface
 * and registering it in the scanner.
 */
export interface DiscoverySource {
  /** Source type identifier. */
  readonly type: DiscoverySourceType;

  /**
   * Scan for projects using the given configuration.
   *
   * @param config - Source-specific configuration from the discovery_sources DB table.
   *   Filesystem: { path: string, recursive?: boolean }
   *   Dokploy: { instanceUrl: string, apiKey: string }
   *   GitHub: { org?: string, user?: string, token: string }
   *   Manual: never called (manual projects are user-registered)
   * @returns Array of discovered projects
   */
  scan(config: Record<string, unknown>): Promise<DiscoveredProject[]>;
}

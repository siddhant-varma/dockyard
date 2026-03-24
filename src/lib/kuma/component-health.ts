/**
 * Component health delegation to Uptime Kuma monitors.
 *
 * Maps Kuma monitor groups to DockYard component health summaries.
 * When a project uses Kuma monitoring, this module replaces the internal
 * `getComponentHealth()` function by deriving component status from
 * Kuma monitor data.
 *
 * Monitor-to-component mapping uses the naming convention:
 * "ProjectName - ComponentName" where ComponentName becomes the
 * DockYard component name (e.g., "Aether Core - Database" maps to "Database").
 *
 * @module kuma/component-health
 */

import { isKumaConfigured } from "./adapter";
import type { ComponentHealthSummary } from "@/lib/health/components";

/**
 * Get per-component health status for a project from Kuma monitors.
 *
 * Queries the Kuma status page data for monitors matching the given
 * project slug, then transforms each monitor into a ComponentHealthSummary
 * compatible with the existing Watchtower component health display.
 *
 * @param projectSlug - URL-safe project identifier
 * @returns Array of component health summaries derived from Kuma monitors
 */
export async function getKumaComponentHealth(
  projectSlug: string
): Promise<ComponentHealthSummary[]> {
  if (!isKumaConfigured()) return [];

  // Dynamic import to avoid circular dependencies
  const { fetchKumaMonitorDetails } = await import("./uptime");
  const details = await fetchKumaMonitorDetails(projectSlug);

  return details.map((detail) => ({
    name: extractComponentName(detail.name),
    status: mapToComponentStatus(detail.status),
    latencyMs: detail.latencyMs,
    avgLatencyMs: detail.latencyMs,
    checkCount: 1,
    failureCount: detail.status === "down" ? 1 : 0,
    lastCheckedAt: new Date(),
    message: null,
  }));
}

/**
 * Check if a project should use Kuma for component health.
 *
 * A project uses Kuma component health if:
 * 1. Kuma is configured globally
 * 2. The project's monitoring source is "kuma" or "both"
 *
 * @param monitoringSource - The project's configured monitoring source
 * @returns Whether to use Kuma for component health
 */
export function shouldUseKumaComponentHealth(
  monitoringSource: string
): boolean {
  if (!isKumaConfigured()) return false;
  return monitoringSource === "kuma" || monitoringSource === "both";
}

/**
 * Merge internal component health with Kuma component health.
 *
 * When a project uses "both" monitoring sources, this function
 * combines results from internal health checks and Kuma monitors.
 * Kuma data takes precedence for components that exist in both sources.
 *
 * @param internal - Component health from DockYard's internal poller
 * @param kuma - Component health from Kuma monitors
 * @returns Merged component health array
 */
export function mergeComponentHealth(
  internal: ComponentHealthSummary[],
  kuma: ComponentHealthSummary[]
): ComponentHealthSummary[] {
  const merged = new Map<string, ComponentHealthSummary>();

  // Add internal components first
  for (const comp of internal) {
    merged.set(comp.name.toLowerCase(), comp);
  }

  // Kuma components override internal ones by name
  for (const comp of kuma) {
    merged.set(comp.name.toLowerCase(), comp);
  }

  return Array.from(merged.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/**
 * Extract the component name from a Kuma monitor name.
 *
 * Convention: "ProjectName - ComponentName" extracts "ComponentName".
 * If no separator is found, uses the full monitor name.
 */
function extractComponentName(monitorName: string): string {
  const separatorIndex = monitorName.indexOf(" - ");
  if (separatorIndex >= 0) {
    return monitorName.substring(separatorIndex + 3).trim();
  }
  return monitorName.trim();
}

/**
 * Map a DockYard health status string to the ComponentHealthSummary status.
 */
function mapToComponentStatus(
  status: string
): "ok" | "degraded" | "down" {
  switch (status) {
    case "healthy":
      return "ok";
    case "degraded":
      return "degraded";
    case "down":
      return "down";
    default:
      return "down";
  }
}

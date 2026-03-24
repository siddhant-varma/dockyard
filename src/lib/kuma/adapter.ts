/**
 * Health adapter — transforms Uptime Kuma monitor data into the
 * `HealthSummary` type used by Watchtower components.
 *
 * This adapter bridges the gap between Kuma's monitor model and DockYard's
 * health card interface. It handles status mapping, uptime extraction, and
 * component aggregation.
 *
 * @module kuma/adapter
 */

import type { KumaMonitor, KumaMonitorStatus } from "./types";
import type { HealthSummary } from "@/components/watchtower/health-card";

/**
 * Map a Kuma numeric status to the DockYard health status string.
 *
 * @param status - Kuma status code (0=down, 1=up, 2=pending, 3=maintenance)
 * @returns DockYard health status string
 */
export function kumaStatusToHealth(
  status: KumaMonitorStatus
): HealthSummary["status"] {
  switch (status) {
    case 1:
      return "healthy";
    case 0:
      return "down";
    case 2:
      return "unknown";
    case 3:
      return "degraded";
    default:
      return "unknown";
  }
}

/**
 * Format the last check time as a relative string (e.g., "30s ago").
 *
 * @param isoDate - ISO 8601 timestamp of the last check
 * @returns Human-readable relative time string
 */
function formatRelativeTime(isoDate: string | undefined): string {
  if (!isoDate) return "never";
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
  return `${Math.floor(diffSecs / 86400)}d ago`;
}

/**
 * Transform a single Uptime Kuma monitor into a DockYard HealthSummary.
 *
 * Used when each Kuma monitor maps directly to a DockYard project
 * (1:1 relationship).
 *
 * @param monitor - The Kuma monitor data to transform
 * @returns A HealthSummary compatible with Watchtower health cards
 */
export function kumaToHealthSummary(monitor: KumaMonitor): HealthSummary {
  return {
    projectName: monitor.name,
    slug: slugify(monitor.name),
    status: kumaStatusToHealth(monitor.status),
    uptime30d: monitor.uptime720 ?? null,
    latencyMs: monitor.avgPing ?? null,
    lastChecked: formatRelativeTime(undefined),
    components: [],
    source: "kuma",
  };
}

/**
 * Aggregate multiple Kuma monitors belonging to the same project
 * into a single HealthSummary.
 *
 * The overall status is the worst status among all monitors:
 * down > degraded > unknown > healthy.
 *
 * Each monitor becomes a component entry in the health summary.
 *
 * @param projectName - Display name for the project
 * @param slug - URL-safe project slug
 * @param monitors - Array of Kuma monitors belonging to this project
 * @returns Aggregated HealthSummary for the project
 */
export function kumaMonitorsToHealthSummary(
  projectName: string,
  slug: string,
  monitors: KumaMonitor[]
): HealthSummary {
  if (monitors.length === 0) {
    return {
      projectName,
      slug,
      status: "unknown",
      uptime30d: null,
      latencyMs: null,
      lastChecked: "no monitors",
      components: [],
      source: "kuma",
    };
  }

  const components = monitors.map((m) => ({
    name: m.name,
    status: kumaStatusToHealth(m.status),
  }));

  const overallStatus = deriveOverallStatus(monitors);

  const uptimes = monitors
    .map((m) => m.uptime720)
    .filter((u): u is number => u != null);
  const uptime30d =
    uptimes.length > 0
      ? Math.round((uptimes.reduce((a, b) => a + b, 0) / uptimes.length) * 100) / 100
      : null;

  const pings = monitors
    .map((m) => m.avgPing)
    .filter((p): p is number => p != null);
  const latencyMs =
    pings.length > 0
      ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length)
      : null;

  return {
    projectName,
    slug,
    status: overallStatus,
    uptime30d,
    latencyMs,
    lastChecked: formatRelativeTime(undefined),
    components,
    source: "kuma",
  };
}

/**
 * Derive the worst overall status from a set of monitors.
 *
 * Priority: down > degraded > unknown > healthy.
 */
function deriveOverallStatus(
  monitors: KumaMonitor[]
): HealthSummary["status"] {
  const statusPriority: Record<string, number> = {
    down: 0,
    degraded: 1,
    unknown: 2,
    healthy: 3,
  };

  let worstStatus: HealthSummary["status"] = "healthy";
  let worstPriority = 3;

  for (const monitor of monitors) {
    const status = kumaStatusToHealth(monitor.status);
    const priority = statusPriority[status] ?? 2;
    if (priority < worstPriority) {
      worstPriority = priority;
      worstStatus = status;
    }
  }

  return worstStatus;
}

/**
 * Convert a monitor name to a URL-safe slug.
 *
 * @param name - Monitor display name
 * @returns URL-safe slug
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Check whether Uptime Kuma integration is configured.
 *
 * Returns true if the `KUMA_URL` environment variable is set,
 * indicating that a Kuma instance is available for health monitoring.
 *
 * @returns Whether Kuma is configured
 */
export function isKumaConfigured(): boolean {
  return !!process.env.KUMA_URL;
}

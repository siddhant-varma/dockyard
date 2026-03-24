/**
 * Uptime Kuma uptime data delegation.
 *
 * Fetches uptime data from an Uptime Kuma instance when configured.
 * Provides functions to query monitor uptime, fetch health summaries
 * for Watchtower pages, and retrieve per-monitor detail breakdowns.
 *
 * Falls back gracefully when Kuma is not configured or unreachable.
 *
 * @module kuma/uptime
 */

import type { KumaMonitor } from "./types";
import { kumaStatusToHealth, kumaMonitorsToHealthSummary, isKumaConfigured } from "./adapter";
import type { HealthSummary } from "@/components/watchtower/health-card";

/** Kuma API base URL from environment. */
function getKumaUrl(): string {
  return process.env.KUMA_URL ?? "";
}

/**
 * Get uptime percentage for a specific Uptime Kuma monitor.
 *
 * Queries the Kuma status page JSON API to retrieve uptime data
 * for a given monitor over the specified time window.
 *
 * @param monitorId - The numeric monitor ID in Uptime Kuma
 * @param hours - Number of hours to calculate uptime for (default: 720 = 30 days)
 * @returns Uptime percentage (0-100), or null if unavailable
 */
export async function getKumaUptime(
  monitorId: number,
  hours = 720
): Promise<number | null> {
  if (!isKumaConfigured()) return null;

  try {
    const kumaUrl = getKumaUrl();
    // Kuma stores uptime keyed as "monitorId_hours" in the uptimeList
    const res = await fetch(`${kumaUrl}/api/status-page/dockyard`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const uptimeKey = `${monitorId}_${hours}`;
    const uptime = data?.uptimeList?.[uptimeKey];
    if (typeof uptime === "number") {
      return Math.round(uptime * 10000) / 100;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch all Kuma monitors as HealthSummary objects for the Watchtower overview.
 *
 * Groups monitors by project (using tags or naming conventions) and
 * aggregates them into HealthSummary objects compatible with the
 * Watchtower health card grid.
 *
 * @returns Array of HealthSummary objects, one per monitored project
 */
export async function fetchKumaHealthProjects(): Promise<HealthSummary[]> {
  if (!isKumaConfigured()) return [];

  const monitors = await fetchAllMonitors();
  if (monitors.length === 0) return [];

  // Group monitors by project tag or parent group
  const groups = groupMonitorsByProject(monitors);

  return Array.from(groups.entries()).map(([slug, group]) => {
    return kumaMonitorsToHealthSummary(group.name, slug, group.monitors);
  });
}

/**
 * Fetch health detail for a specific project slug from Kuma monitors.
 *
 * @param slug - The project slug to find monitors for
 * @returns HealthSummary for the project, or null if not found
 */
export async function fetchKumaHealthDetail(
  slug: string
): Promise<HealthSummary | null> {
  if (!isKumaConfigured()) return null;

  const monitors = await fetchAllMonitors();
  const groups = groupMonitorsByProject(monitors);
  const group = groups.get(slug);

  if (!group) return null;

  return kumaMonitorsToHealthSummary(group.name, slug, group.monitors);
}

/** Per-monitor detail returned to the health detail page. */
interface MonitorDetail {
  name: string;
  status: string;
  latencyMs: number | null;
  uptime24h: number | null;
  uptime30d: number | null;
  type: string;
  url: string;
  interval: number;
}

/**
 * Fetch per-monitor breakdown for a project from Kuma.
 *
 * Returns detailed information about each monitor associated with the
 * given project slug, including latency, uptime, and monitor type.
 *
 * @param slug - The project slug to find monitors for
 * @returns Array of monitor detail objects
 */
export async function fetchKumaMonitorDetails(
  slug: string
): Promise<MonitorDetail[]> {
  if (!isKumaConfigured()) return [];

  const monitors = await fetchAllMonitors();
  const groups = groupMonitorsByProject(monitors);
  const group = groups.get(slug);

  if (!group) return [];

  return group.monitors.map((m) => ({
    name: m.name,
    status: kumaStatusToHealth(m.status),
    latencyMs: m.avgPing ?? null,
    uptime24h: m.uptime24 ?? null,
    uptime30d: m.uptime720 ?? null,
    type: m.type,
    url: m.url,
    interval: m.interval,
  }));
}

/**
 * Fetch uptime trend data from Kuma for the health sparklines component.
 *
 * Checks if a project uses Kuma monitoring and returns uptime data
 * from the Kuma API if available.
 *
 * @param slug - Project slug
 * @param hours - Number of hours for the trend window (default: 24)
 * @returns Uptime percentage, or null if not available from Kuma
 */
export async function getKumaUptimeTrend(
  slug: string,
  hours = 24
): Promise<number | null> {
  if (!isKumaConfigured()) return null;

  const monitors = await fetchAllMonitors();
  const groups = groupMonitorsByProject(monitors);
  const group = groups.get(slug);

  if (!group || group.monitors.length === 0) return null;

  // Use the first monitor's uptime as a representative value
  const primaryMonitor = group.monitors[0];
  return getKumaUptime(primaryMonitor.id, hours);
}

/* ================================================================
   Internal helpers
   ================================================================ */

/** Cached monitor list with TTL. */
let monitorCache: KumaMonitor[] = [];
let monitorCacheTimestamp = 0;
const MONITOR_CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Fetch all monitors from the Kuma status page JSON endpoint.
 * Results are cached for 30 seconds to avoid excessive API calls.
 */
async function fetchAllMonitors(): Promise<KumaMonitor[]> {
  if (Date.now() - monitorCacheTimestamp < MONITOR_CACHE_TTL_MS && monitorCache.length > 0) {
    return monitorCache;
  }

  try {
    const kumaUrl = getKumaUrl();
    const res = await fetch(`${kumaUrl}/api/status-page/dockyard`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const heartbeatList = data?.heartbeatList ?? {};
    const uptimeList = data?.uptimeList ?? {};
    const groups = data?.publicGroupList ?? [];

    // Build monitor objects from status page data
    const monitors: KumaMonitor[] = [];
    for (const group of groups) {
      for (const monitorRef of group.monitorList ?? []) {
        const heartbeats = heartbeatList[String(monitorRef.id)] ?? [];
        const latest = heartbeats.length > 0 ? heartbeats[heartbeats.length - 1] : null;

        monitors.push({
          id: monitorRef.id,
          name: monitorRef.name ?? `Monitor ${monitorRef.id}`,
          type: "http",
          url: "",
          interval: 60,
          active: true,
          status: latest?.status ?? 2,
          maxretries: 0,
          accepted_statuscodes: ["200-299"],
          description: "",
          uptime24: uptimeList[`${monitorRef.id}_24`]
            ? Math.round((uptimeList[`${monitorRef.id}_24`] as number) * 10000) / 100
            : undefined,
          uptime720: uptimeList[`${monitorRef.id}_720`]
            ? Math.round((uptimeList[`${monitorRef.id}_720`] as number) * 10000) / 100
            : undefined,
          avgPing: latest?.ping ?? undefined,
          tags: [],
          parent: null,
          notificationIDList: {},
          method: "GET",
          body: null,
          headers: null,
          port: null,
          hostname: null,
          keyword: null,
        });
      }
    }

    monitorCache = monitors;
    monitorCacheTimestamp = Date.now();
    return monitors;
  } catch {
    return [];
  }
}

/** A grouped set of monitors belonging to one project. */
interface MonitorGroup {
  name: string;
  monitors: KumaMonitor[];
}

/**
 * Group monitors by project. Uses Kuma's status page groups as the
 * primary grouping mechanism. Each group maps to a DockYard project.
 */
function groupMonitorsByProject(
  monitors: KumaMonitor[]
): Map<string, MonitorGroup> {
  const groups = new Map<string, MonitorGroup>();

  for (const monitor of monitors) {
    // Use the monitor name to derive a project slug
    // Convention: "ProjectName - ComponentName" or just "ProjectName"
    const parts = monitor.name.split(" - ");
    const projectName = parts[0].trim();
    const slug = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const existing = groups.get(slug);
    if (existing) {
      existing.monitors.push(monitor);
    } else {
      groups.set(slug, { name: projectName, monitors: [monitor] });
    }
  }

  return groups;
}

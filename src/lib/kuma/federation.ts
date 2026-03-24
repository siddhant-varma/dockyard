/**
 * Federated monitoring — support for projects running their own
 * Uptime Kuma instances.
 *
 * Some projects may have their own dedicated Uptime Kuma instance
 * (separate from DockYard's central Kuma). This module fetches
 * public status page data from those external Kuma instances and
 * normalizes it into DockYard's health data model.
 *
 * Federation is unidirectional: DockYard reads from external Kuma
 * instances but does not write to them. The external Kuma instance
 * must have a public status page configured.
 *
 * @module kuma/federation
 */

import type { StatusPagePublicData, KumaHeartbeat, KumaIncident } from "./types";

/** Health data from a federated Uptime Kuma instance. */
export interface FederatedHealthData {
  /** URL of the external Kuma instance. */
  kumaUrl: string;
  /** Whether the fetch was successful. */
  available: boolean;
  /** Status page title from the external Kuma instance. */
  title: string | null;
  /** Overall status derived from all monitors. */
  overallStatus: "healthy" | "degraded" | "down" | "unknown";
  /** Per-monitor health breakdown. */
  monitors: FederatedMonitorStatus[];
  /** Active incident from the status page, if any. */
  incident: KumaIncident | null;
  /** ISO 8601 timestamp of when the data was fetched. */
  fetchedAt: string;
  /** Error message if the fetch failed. */
  error?: string;
}

/** Status of a single monitor from a federated Kuma instance. */
export interface FederatedMonitorStatus {
  /** Monitor ID in the external Kuma instance. */
  id: number;
  /** Monitor display name. */
  name: string;
  /** Current status: "up", "down", "pending", or "maintenance". */
  status: "up" | "down" | "pending" | "maintenance";
  /** Average response time from recent heartbeats (ms). */
  avgPingMs: number | null;
  /** Uptime percentage (24h), if available. */
  uptime24h: number | null;
  /** Uptime percentage (30d), if available. */
  uptime30d: number | null;
}

/** Timeout for federated status page fetches. */
const FEDERATION_TIMEOUT_MS = 8000;

/**
 * Fetch public status page data from an external Uptime Kuma instance.
 *
 * Queries the public JSON endpoint of a Kuma status page to retrieve
 * monitor statuses, heartbeat data, and active incidents. This does not
 * require authentication — it only reads publicly available data.
 *
 * @param kumaUrl - Base URL of the external Kuma instance (e.g., "https://status.example.com")
 * @param statusPageSlug - Slug of the public status page (default: "default")
 * @returns Normalized federated health data
 */
export async function fetchFederatedStatus(
  kumaUrl: string,
  statusPageSlug = "default"
): Promise<FederatedHealthData> {
  const fetchedAt = new Date().toISOString();

  try {
    const url = `${kumaUrl.replace(/\/+$/, "")}/api/status-page/${statusPageSlug}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FEDERATION_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return {
        kumaUrl,
        available: false,
        title: null,
        overallStatus: "unknown",
        monitors: [],
        incident: null,
        fetchedAt,
        error: `HTTP ${res.status} ${res.statusText}`,
      };
    }

    const data = (await res.json()) as StatusPagePublicData;
    const monitors = extractMonitorStatuses(data);
    const overallStatus = deriveOverallStatus(monitors);

    return {
      kumaUrl,
      available: true,
      title: data.config?.title ?? null,
      overallStatus,
      monitors,
      incident: data.incident ?? null,
      fetchedAt,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      kumaUrl,
      available: false,
      title: null,
      overallStatus: "unknown",
      monitors: [],
      incident: null,
      fetchedAt,
      error: message.includes("abort") ? "Timeout (8s)" : message,
    };
  }
}

/**
 * Extract monitor statuses from Kuma status page public data.
 *
 * Parses the publicGroupList and heartbeatList to build a normalized
 * array of monitor statuses.
 */
function extractMonitorStatuses(
  data: StatusPagePublicData
): FederatedMonitorStatus[] {
  const monitors: FederatedMonitorStatus[] = [];
  const heartbeatList = data.heartbeatList ?? {};
  const uptimeList = data.uptimeList ?? {};

  for (const group of data.publicGroupList ?? []) {
    for (const monitorRef of group.monitorList ?? []) {
      const heartbeats: KumaHeartbeat[] = heartbeatList[String(monitorRef.id)] ?? [];
      const latest = heartbeats.length > 0 ? heartbeats[heartbeats.length - 1] : null;

      // Calculate average ping from recent heartbeats
      const pings = heartbeats
        .filter((hb) => hb.ping >= 0)
        .map((hb) => hb.ping);
      const avgPingMs =
        pings.length > 0
          ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length)
          : null;

      // Extract uptime from the uptime list
      const uptime24h = parseUptimeValue(uptimeList[`${monitorRef.id}_24`]);
      const uptime30d = parseUptimeValue(uptimeList[`${monitorRef.id}_720`]);

      monitors.push({
        id: monitorRef.id,
        name: monitorRef.name,
        status: mapHeartbeatStatus(latest?.status),
        avgPingMs,
        uptime24h,
        uptime30d,
      });
    }
  }

  return monitors;
}

/**
 * Derive the overall status from an array of federated monitor statuses.
 * Priority: down > maintenance > pending > up.
 */
function deriveOverallStatus(
  monitors: FederatedMonitorStatus[]
): FederatedHealthData["overallStatus"] {
  if (monitors.length === 0) return "unknown";

  const hasDown = monitors.some((m) => m.status === "down");
  if (hasDown) return "down";

  const hasMaintenance = monitors.some((m) => m.status === "maintenance");
  const hasPending = monitors.some((m) => m.status === "pending");
  if (hasMaintenance || hasPending) return "degraded";

  return "healthy";
}

/**
 * Map a Kuma heartbeat status code to a human-readable status string.
 */
function mapHeartbeatStatus(
  status: number | undefined
): FederatedMonitorStatus["status"] {
  switch (status) {
    case 1:
      return "up";
    case 0:
      return "down";
    case 2:
      return "pending";
    case 3:
      return "maintenance";
    default:
      return "pending";
  }
}

/**
 * Parse an uptime value from the Kuma uptimeList.
 * Values are stored as decimals (0.9994 = 99.94%).
 */
function parseUptimeValue(value: unknown): number | null {
  if (typeof value !== "number") return null;
  return Math.round(value * 10000) / 100;
}

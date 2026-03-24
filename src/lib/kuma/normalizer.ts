/**
 * Kuma webhook payload normalizer.
 *
 * Converts incoming Uptime Kuma webhook payloads into DockYard
 * SignalEvent format for storage in the `signal_events` table.
 *
 * Uptime Kuma sends webhook notifications when a monitor's status
 * changes (up → down, down → up). This normalizer maps those status
 * transitions to DockYard event types.
 *
 * @module kuma/normalizer
 */

import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("kuma.normalizer");

/** Normalized Kuma signal event ready for storage. */
export interface NormalizedKumaEvent {
  /** Source identifier for the signal event. */
  source: "kuma";
  /** DockYard event type (e.g., "cc.dockyard.kuma.monitor.down"). */
  eventType: string;
  /** Kuma monitor ID that triggered the event. */
  monitorId: number;
  /** Monitor name from Kuma for display purposes. */
  monitorName: string;
  /** Structured payload for storage. */
  rawPayload: Record<string, unknown>;
}

/**
 * Raw webhook payload sent by Uptime Kuma when a monitor status changes.
 *
 * Kuma's webhook notification sends a JSON object with monitor details
 * and the heartbeat that triggered the notification.
 */
export interface KumaWebhookPayload {
  /** The heartbeat that triggered the notification. */
  heartbeat?: {
    /** Monitor ID. */
    monitorID?: number;
    /** Status: 0=down, 1=up, 2=pending. */
    status?: number;
    /** ISO 8601 timestamp. */
    time?: string;
    /** Status message (e.g., "200 - OK" or error description). */
    msg?: string;
    /** Response time in milliseconds. */
    ping?: number;
    /** Whether this status change is important (new incident). */
    important?: boolean;
    /** Total check duration in ms. */
    duration?: number;
  };
  /** The monitor that triggered the notification. */
  monitor?: {
    /** Monitor ID. */
    id?: number;
    /** Monitor display name. */
    name?: string;
    /** Monitor type (e.g., "http", "keyword"). */
    type?: string;
    /** Target URL being monitored. */
    url?: string;
    /** Hostname for non-URL monitors. */
    hostname?: string;
    /** Port for port-type monitors. */
    port?: number;
    /** Tags attached to the monitor. */
    tags?: Array<{
      /** Tag name. */
      name?: string;
      /** Tag value. */
      value?: string;
    }>;
  };
  /** Human-readable notification message. */
  msg?: string;
}

/** Map Kuma numeric status to DockYard event type suffix. */
const STATUS_EVENT_MAP: Record<number, string> = {
  0: "monitor.down",
  1: "monitor.up",
  2: "monitor.pending",
  3: "monitor.maintenance",
};

/** Map Kuma numeric status to human-readable label. */
const STATUS_LABEL_MAP: Record<number, string> = {
  0: "down",
  1: "up",
  2: "pending",
  3: "maintenance",
};

/**
 * Normalize an Uptime Kuma webhook payload into a DockYard signal event.
 *
 * Maps Kuma's status change notifications to DockYard event types:
 * - Status 0 → `cc.dockyard.kuma.monitor.down`
 * - Status 1 → `cc.dockyard.kuma.monitor.up`
 * - Status 2 → `cc.dockyard.kuma.monitor.pending`
 * - Status 3 → `cc.dockyard.kuma.monitor.maintenance`
 *
 * @param payload - Raw webhook payload from Uptime Kuma
 * @returns Normalized event, or null if the payload is invalid
 */
export function normalizeKumaWebhook(
  payload: KumaWebhookPayload
): NormalizedKumaEvent | null {
  const heartbeat = payload.heartbeat;
  const monitor = payload.monitor;

  if (!heartbeat || !monitor) {
    log.warn("Invalid Kuma webhook payload — missing heartbeat or monitor");
    return null;
  }

  const monitorId = heartbeat.monitorID ?? monitor.id;
  if (monitorId === undefined || monitorId === null) {
    log.warn("Kuma webhook payload missing monitor ID");
    return null;
  }

  const status = heartbeat.status ?? 2;
  const eventSuffix = STATUS_EVENT_MAP[status] ?? "monitor.unknown";
  const statusLabel = STATUS_LABEL_MAP[status] ?? "unknown";

  const monitorName = monitor.name ?? `Monitor #${monitorId}`;

  log.info(
    {
      monitorId,
      monitorName,
      status: statusLabel,
      ping: heartbeat.ping,
      url: monitor.url,
    },
    "Kuma webhook normalized"
  );

  return {
    source: "kuma",
    eventType: `cc.dockyard.kuma.${eventSuffix}`,
    monitorId,
    monitorName,
    rawPayload: {
      monitorId,
      monitorName,
      monitorType: monitor.type ?? "unknown",
      monitorUrl: monitor.url ?? monitor.hostname ?? "unknown",
      status: statusLabel,
      statusCode: status,
      message: heartbeat.msg ?? payload.msg ?? "",
      ping: heartbeat.ping ?? -1,
      duration: heartbeat.duration ?? 0,
      time: heartbeat.time ?? new Date().toISOString(),
      important: heartbeat.important ?? false,
      tags:
        monitor.tags?.map((t) => ({
          name: t.name,
          value: t.value,
        })) ?? [],
    },
  };
}

/**
 * Extract a DockYard-compatible project slug from a Kuma monitor's tags.
 *
 * Kuma monitors can be tagged with a `dockyard-project` tag whose value
 * is the project slug. This allows automatic association of Kuma webhooks
 * with DockYard projects.
 *
 * @param payload - Raw webhook payload from Kuma
 * @returns The project slug, or null if not tagged
 */
export function extractProjectSlug(
  payload: KumaWebhookPayload
): string | null {
  const tags = payload.monitor?.tags;
  if (!tags || tags.length === 0) return null;

  const projectTag = tags.find(
    (t) => t.name === "dockyard-project" && t.value
  );
  return projectTag?.value ?? null;
}

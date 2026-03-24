/**
 * TypeScript type definitions for Uptime Kuma API responses.
 *
 * Uptime Kuma is an open-source, self-hosted monitoring tool. These types
 * model its REST-like API responses for monitors, heartbeats, status pages,
 * and notifications.
 *
 * @see https://github.com/louislam/uptime-kuma
 */

/* ================================================================
   Monitor Types
   ================================================================ */

/** Possible monitor status values returned by the Uptime Kuma API. */
export type KumaMonitorStatus = 0 | 1 | 2 | 3;

/** Human-readable labels for monitor status codes. */
export const KUMA_STATUS_LABELS: Record<KumaMonitorStatus, string> = {
  0: "down",
  1: "up",
  2: "pending",
  3: "maintenance",
};

/**
 * Monitor type identifiers used by Uptime Kuma.
 * Common types: "http", "port", "ping", "keyword", "dns", "push", "docker".
 */
export type KumaMonitorType =
  | "http"
  | "port"
  | "ping"
  | "keyword"
  | "dns"
  | "push"
  | "steam"
  | "gamedig"
  | "mqtt"
  | "sqlserver"
  | "postgres"
  | "mysql"
  | "mongodb"
  | "radius"
  | "redis"
  | "docker"
  | "grpc-keyword"
  | "json-query"
  | "real-browser"
  | "tailscale-ping"
  | "group";

/**
 * Represents a single monitor in Uptime Kuma.
 *
 * Each monitor watches a URL, port, or service and reports its status
 * at a configurable interval.
 */
export interface KumaMonitor {
  /** Unique monitor ID (auto-incremented by Kuma). */
  id: number;
  /** Human-readable display name. */
  name: string;
  /** Monitor type (e.g., "http", "ping", "port"). */
  type: KumaMonitorType;
  /** Target URL or hostname being monitored. */
  url: string;
  /** Check interval in seconds. */
  interval: number;
  /** Whether the monitor is actively checking (true) or paused (false). */
  active: boolean;
  /** Current status: 0=down, 1=up, 2=pending, 3=maintenance. */
  status: KumaMonitorStatus;
  /** Number of retry attempts before marking as down. */
  maxretries: number;
  /** Expected HTTP status codes (comma-separated, e.g., "200-299"). */
  accepted_statuscodes: string[];
  /** Monitor description or notes. */
  description: string;
  /** Uptime percentage over the last 24 hours (0-100). */
  uptime24?: number;
  /** Uptime percentage over the last 30 days (0-100). */
  uptime720?: number;
  /** Average response time in ms over the last 24 hours. */
  avgPing?: number;
  /** Tags associated with this monitor. */
  tags: KumaMonitorTag[];
  /** Parent monitor ID (for grouped monitors). */
  parent: number | null;
  /** Notification IDs linked to this monitor. */
  notificationIDList: Record<string, boolean>;
  /** HTTP method for HTTP-type monitors. */
  method: string;
  /** Request body for HTTP-type monitors. */
  body: string | null;
  /** Custom headers for HTTP-type monitors (JSON string). */
  headers: string | null;
  /** Port number for port-type monitors. */
  port: number | null;
  /** Hostname for certain monitor types (DNS, port). */
  hostname: string | null;
  /** Keyword to search for in the response (keyword-type monitors). */
  keyword: string | null;
}

/** Tag attached to a Kuma monitor for categorization. */
export interface KumaMonitorTag {
  /** Tag ID. */
  tag_id: number;
  /** Tag display name. */
  name: string;
  /** Tag color (hex code, e.g., "#FF0000"). */
  color: string;
  /** Tag value (free-form text). */
  value: string;
}

/* ================================================================
   Heartbeat Types
   ================================================================ */

/**
 * A single heartbeat entry — one check result from Uptime Kuma.
 *
 * Heartbeats form a time-series record of a monitor's status over time.
 */
export interface KumaHeartbeat {
  /** ID of the monitor this heartbeat belongs to. */
  monitorId: number;
  /** Status at the time of check: 0=down, 1=up, 2=pending. */
  status: KumaMonitorStatus;
  /** ISO 8601 timestamp of when the check occurred. */
  time: string;
  /** Human-readable status message (e.g., "200 - OK" or error description). */
  msg: string;
  /** Response time in milliseconds (-1 if unreachable). */
  ping: number;
  /** Total check duration in milliseconds. */
  duration: number;
}

/* ================================================================
   Status Page Types
   ================================================================ */

/**
 * A status page configuration in Uptime Kuma.
 *
 * Status pages aggregate multiple monitors into a public-facing
 * status dashboard.
 */
export interface KumaStatusPage {
  /** Unique status page ID. */
  id: number;
  /** URL-safe slug (used in the status page URL path). */
  slug: string;
  /** Display title of the status page. */
  title: string;
  /** Optional description shown on the page. */
  description: string;
  /** Whether the status page is published (publicly accessible). */
  published: boolean;
  /** Monitor groups displayed on this status page. */
  publicGroupList: KumaStatusPageGroup[];
}

/** A group of monitors displayed on a status page. */
export interface KumaStatusPageGroup {
  /** Group ID. */
  id: number;
  /** Group display name. */
  name: string;
  /** Monitors in this group (with their IDs). */
  monitorList: Array<{
    id: number;
    name: string;
  }>;
}

/**
 * Public data returned by the status page JSON endpoint.
 *
 * This is the unauthenticated, public-facing data for a status page,
 * suitable for embedding or external consumption.
 */
export interface StatusPagePublicData {
  /** Configuration of the status page. */
  config: {
    slug: string;
    title: string;
    description: string;
    icon: string;
    published: boolean;
  };
  /** Incident reports shown on the status page. */
  incident: KumaIncident | null;
  /** Monitor groups with their current heartbeat data. */
  publicGroupList: Array<{
    id: number;
    name: string;
    monitorList: Array<{
      id: number;
      name: string;
    }>;
  }>;
  /** Heartbeat data keyed by monitor ID. */
  heartbeatList: Record<string, KumaHeartbeat[]>;
  /** Uptime data keyed by monitor ID and time range. */
  uptimeList: Record<string, number>;
}

/** An incident displayed on a Kuma status page. */
export interface KumaIncident {
  /** Incident ID. */
  id: number;
  /** Incident title. */
  title: string;
  /** Incident content/description (may contain Markdown). */
  content: string;
  /** Incident style: "info", "warning", "danger", "primary". */
  style: "info" | "warning" | "danger" | "primary";
  /** ISO 8601 timestamp of when the incident was created. */
  createdDate: string;
  /** ISO 8601 timestamp of the last update, or null. */
  lastUpdatedDate: string | null;
}

/* ================================================================
   Notification Types
   ================================================================ */

/**
 * A notification channel configured in Uptime Kuma.
 *
 * Kuma supports many notification providers (Slack, Discord, email, etc.).
 * The `config` field contains provider-specific settings as a JSON string.
 */
export interface KumaNotification {
  /** Unique notification ID. */
  id: number;
  /** Display name of the notification channel. */
  name: string;
  /** Notification provider type (e.g., "slack", "telegram", "smtp"). */
  type: string;
  /** Whether this notification is active. */
  active: boolean;
  /** Whether this is the default notification for new monitors. */
  isDefault: boolean;
  /** Provider-specific configuration (JSON string). */
  config: string;
}

/* ================================================================
   Input Types (for mutations)
   ================================================================ */

/**
 * Input data for creating a new monitor in Uptime Kuma.
 *
 * Only required fields are mandatory — Kuma applies sensible defaults
 * for everything else.
 */
export interface CreateMonitorInput {
  /** Human-readable display name for the monitor. */
  name: string;
  /** Monitor type (e.g., "http", "ping", "port"). */
  type: KumaMonitorType;
  /** Target URL or hostname to monitor. */
  url: string;
  /** Check interval in seconds (default: 60). */
  interval?: number;
  /** Number of retries before marking as down (default: 0). */
  maxretries?: number;
  /** Expected HTTP status codes (default: ["200-299"]). */
  accepted_statuscodes?: string[];
  /** Monitor description or notes. */
  description?: string;
  /** HTTP method for HTTP-type monitors (default: "GET"). */
  method?: string;
  /** Request body for HTTP-type monitors. */
  body?: string;
  /** Custom headers for HTTP-type monitors (JSON string). */
  headers?: string;
  /** Port number for port-type monitors. */
  port?: number;
  /** Hostname for DNS/port-type monitors. */
  hostname?: string;
  /** Keyword to search for in the response. */
  keyword?: string;
  /** Parent monitor ID (for grouped monitors). */
  parent?: number;
  /** Notification IDs to link to this monitor. */
  notificationIDList?: Record<string, boolean>;
  /** Tags to associate with this monitor. */
  tags?: Array<{ tag_id: number; value: string }>;
}

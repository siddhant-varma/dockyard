/**
 * Abstract provider interfaces for DockYard.
 *
 * These interfaces define the contracts that all infrastructure and deployment
 * provider adapters must implement. Core DockYard code imports these interfaces,
 * never the concrete adapters — enabling ecosystem-agnostic modularity.
 *
 * Current adapters:
 * - DeployProvider: Dokploy (src/lib/dokploy/)
 * - InfraProvider: Hetzner Cloud (src/lib/hetzner/)
 *
 * To add a new provider (e.g., Coolify, DigitalOcean), implement the relevant
 * interface and register it in the provider registry.
 */

/* ================================================================
   Shared Types
   ================================================================ */

/** Time range for metric queries. */
export interface TimeRange {
  start: Date;
  end: Date;
  /** Resolution in seconds (minimum varies by provider). */
  step?: number;
}

/** A single time-series data point. */
export interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

/** A labeled time-series. */
export interface MetricSeries {
  name: string;
  labels: Record<string, string>;
  dataPoints: MetricDataPoint[];
}

/* ================================================================
   DeployProvider — Deployment Platform Abstraction
   ================================================================ */

/** Summary of a deployed application or compose service. */
export interface ApplicationSummary {
  id: string;
  name: string;
  type: "application" | "compose";
  status: "running" | "stopped" | "error" | "building" | "unknown";
  createdAt: Date;
}

/** Full details of a deployed application. */
export interface ApplicationDetail extends ApplicationSummary {
  description?: string;
  repository?: string;
  branch?: string;
  dockerImage?: string;
  domains: string[];
  env: string;
  memoryLimit?: number;
  cpuLimit?: number;
}

/** Result of a deployment operation. */
export interface DeployResult {
  deployId: string;
  status: "queued" | "building" | "deploying" | "success" | "failed";
  message?: string;
}

/** Log entry from a deployed application. */
export interface LogEntry {
  timestamp: Date;
  message: string;
  level?: "info" | "warn" | "error" | "debug";
  source?: string;
}

/** Options for fetching logs. */
export interface LogOptions {
  since?: Date;
  tail?: number;
  follow?: boolean;
}

/**
 * Abstraction over a deployment platform (e.g., Dokploy, Coolify, Caprover).
 *
 * Manages applications, environment variables, deployments, and logs.
 * DockYard core code calls these methods — never the platform API directly.
 */
export interface DeployProvider {
  readonly name: string;

  /** List all applications/services managed by this provider. */
  listApplications(): Promise<ApplicationSummary[]>;

  /** Get full details of a specific application. */
  getApplication(id: string): Promise<ApplicationDetail>;

  /** Trigger a fresh deployment. */
  deploy(id: string): Promise<DeployResult>;

  /** Redeploy the current version (restart with same config). */
  redeploy(id: string): Promise<DeployResult>;

  /** Start a stopped application. */
  start(id: string): Promise<void>;

  /** Stop a running application. */
  stop(id: string): Promise<void>;

  /** Get the full environment variable string for an application. */
  getEnvironment(id: string): Promise<string>;

  /**
   * Replace the full environment variable string for an application.
   * Note: Dokploy requires the FULL env string, not individual key-value updates.
   */
  saveEnvironment(id: string, env: string): Promise<void>;

  /** Fetch recent log entries from an application. */
  getLogs(id: string, options?: LogOptions): Promise<LogEntry[]>;

  /** Fetch resource metrics (CPU, memory, network) for an application. */
  getMetrics(id: string, range: TimeRange): Promise<MetricSeries[]>;
}

/* ================================================================
   InfraProvider — Infrastructure Platform Abstraction
   ================================================================ */

/** Summary of a server/VM instance. */
export interface ServerSummary {
  id: string;
  name: string;
  status: "running" | "off" | "starting" | "stopping" | "unknown";
  publicIpv4?: string;
  publicIpv6?: string;
  datacenter?: string;
  serverType: string;
}

/** Full details of a server instance. */
export interface ServerDetail extends ServerSummary {
  image?: string;
  createdAt: Date;
  inboundTraffic?: number;
  outboundTraffic?: number;
  includedTraffic?: number;
  volumes: VolumeSummary[];
}

/** Type of server metric to query. */
export type ServerMetricType = "cpu" | "disk" | "network";

/** A storage volume attached to a server. */
export interface VolumeSummary {
  id: string;
  name: string;
  size: number;
  serverId?: string;
  status: "available" | "creating" | "attached";
}

/** A floating IP address. */
export interface FloatingIpSummary {
  id: string;
  ip: string;
  type: "ipv4" | "ipv6";
  serverId?: string;
  dnsPtr?: string;
}

/** A load balancer. */
export interface LoadBalancerSummary {
  id: string;
  name: string;
  publicIpv4?: string;
  targetCount: number;
  status: "running" | "off" | "unknown";
}

/** Pricing information for a resource type. */
export interface PricingInfo {
  serverTypes: Array<{
    name: string;
    priceHourly: number;
    priceMonthly: number;
    currency: string;
  }>;
  trafficPerTb: number;
  currency: string;
}

/**
 * Abstraction over an infrastructure provider (e.g., Hetzner Cloud, DigitalOcean, AWS).
 *
 * Provides server metrics, resource inventory, and pricing data.
 * DockYard core code calls these methods — never the cloud API directly.
 */
export interface InfraProvider {
  readonly name: string;

  /** List all servers in the account/project. */
  listServers(): Promise<ServerSummary[]>;

  /** Get full details of a specific server. */
  getServer(id: string): Promise<ServerDetail>;

  /** Fetch time-series metrics for a server (CPU, disk, network). */
  getServerMetrics(
    id: string,
    type: ServerMetricType | ServerMetricType[],
    range: TimeRange
  ): Promise<MetricSeries[]>;

  /** List all volumes. */
  getVolumes(): Promise<VolumeSummary[]>;

  /** List all floating IPs. */
  getFloatingIps(): Promise<FloatingIpSummary[]>;

  /** List all load balancers. */
  getLoadBalancers(): Promise<LoadBalancerSummary[]>;

  /** Get current pricing information. */
  getPricing(): Promise<PricingInfo>;
}

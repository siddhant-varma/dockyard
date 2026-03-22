/**
 * Hetzner Cloud API client — implements InfraProvider interface.
 *
 * Wraps the Hetzner Cloud REST API for server metrics, resource inventory,
 * and billing/pricing data. All calls go through this client, never directly
 * from frontend or API routes.
 *
 * Rate limit: 3,600 requests/hour per API token.
 * Polling intervals: server metrics every 60s, status every 60s, billing every 6h.
 *
 * @see https://docs.hetzner.cloud/
 */

import type {
  FloatingIpSummary,
  InfraProvider,
  LoadBalancerSummary,
  MetricDataPoint,
  MetricSeries,
  PricingInfo,
  ServerDetail,
  ServerMetricType,
  ServerSummary,
  TimeRange,
  VolumeSummary,
} from "../providers/types";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("hetzner.client");

/* ================================================================
   Hetzner API Response Types (partial — only fields we use)
   ================================================================ */

interface HetznerServer {
  id: number;
  name: string;
  status: string;
  public_net: {
    ipv4?: { ip: string };
    ipv6?: { ip: string };
  };
  datacenter?: { name: string };
  server_type: { name: string; description: string };
  image?: { name: string; description?: string };
  created: string;
  ingoing_traffic: number | null;
  outgoing_traffic: number | null;
  included_traffic: number | null;
  volumes: number[];
}

interface HetznerVolume {
  id: number;
  name: string;
  size: number;
  server: number | null;
  status: string;
}

interface HetznerFloatingIp {
  id: number;
  ip: string;
  type: string;
  server: number | null;
  dns_ptr: Array<{ ip: string; dns_ptr: string }>;
}

interface HetznerLoadBalancer {
  id: number;
  name: string;
  public_net: { ipv4?: { ip: string } };
  targets: unknown[];
  load_balancer_type: { name: string };
}

interface HetznerMetricsResponse {
  metrics: {
    time_series: Record<string, { values: Array<[number, string]> }>;
  };
}

interface HetznerPricingResponse {
  pricing: {
    server_types: Array<{
      server_type: { name: string };
      prices: Array<{
        location: string;
        price_hourly: { gross: string };
        price_monthly: { gross: string };
      }>;
    }>;
    traffic: {
      price_per_tb: { gross: string };
    };
    currency: string;
  };
}

export class HetznerClient implements InfraProvider {
  readonly name = "hetzner";

  private readonly baseUrl = "https://api.hetzner.cloud/v1";

  constructor(private readonly apiToken: string) {}

  private get authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiToken}` };
  }

  /**
   * Fetch JSON from the Hetzner API and check rate limit headers.
   * Wraps fetchJSON with rate-limit-remaining header inspection.
   */
  private async fetchWithRateLimit<T>(endpointPath: string, options?: { params?: string }): Promise<T> {
    const url = options?.params
      ? `${this.baseUrl}${endpointPath}?${options.params}`
      : `${this.baseUrl}${endpointPath}`;

    // Use raw fetch to access headers, then parse JSON
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...this.authHeaders,
      },
      signal: AbortSignal.timeout(10000),
    });

    // Check rate limit headers
    const remaining = parseInt(response.headers.get("ratelimit-remaining") ?? response.headers.get("x-ratelimit-remaining") ?? "", 10);
    if (!isNaN(remaining) && remaining < 100) {
      const resetHeader = response.headers.get("ratelimit-reset") ?? response.headers.get("x-ratelimit-reset");
      const resetAt = resetHeader ? new Date(parseInt(resetHeader, 10) * 1000) : null;
      log.warn({ endpoint: endpointPath, rateLimitRemaining: remaining, resetAt: resetAt?.toISOString() }, "Hetzner rate limit approaching");
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const status = response.status;
      if (status === 401 || status === 403) {
        log.error({ endpoint: endpointPath, status }, "Hetzner auth failure");
      } else {
        log.error({ endpoint: endpointPath, status, body }, "Hetzner API error");
      }
      throw new Error(`Hetzner API error: HTTP ${status} from ${endpointPath}`);
    }

    return (await response.json()) as T;
  }

  async listServers(): Promise<ServerSummary[]> {
    const t0 = performance.now();
    log.info({ method: "GET", endpoint: "/servers" }, "Listing servers");

    const data = await this.fetchWithRateLimit<{ servers: HetznerServer[] }>(
      "/servers"
    );

    const durationMs = Math.round(performance.now() - t0);
    log.info({ method: "GET", endpoint: "/servers", durationMs, status: 200 }, "Listed servers");
    log.debug({ serverCount: data.servers.length }, "Server list response summary");
    return data.servers.map(mapServerSummary);
  }

  async getServer(id: string): Promise<ServerDetail> {
    const t0 = performance.now();
    log.info({ method: "GET", endpoint: `/servers/${id}` }, "Fetching server detail");

    const data = await this.fetchWithRateLimit<{ server: HetznerServer }>(
      `/servers/${id}`
    );
    const volumes = await this.getVolumes();
    const serverVolumes = volumes.filter((v) => v.serverId === id);

    const durationMs = Math.round(performance.now() - t0);
    log.info({ method: "GET", endpoint: `/servers/${id}`, durationMs, status: 200 }, "Fetched server detail");
    log.debug({ serverId: id, volumeCount: serverVolumes.length }, "Server detail response summary");
    return mapServerDetail(data.server, serverVolumes);
  }

  async getServerMetrics(
    id: string,
    type: ServerMetricType | ServerMetricType[],
    range: TimeRange
  ): Promise<MetricSeries[]> {
    const t0 = performance.now();
    const types = Array.isArray(type) ? type.join(",") : type;
    const params = new URLSearchParams({
      type: types,
      start: range.start.toISOString(),
      end: range.end.toISOString(),
    });
    if (range.step) params.set("step", String(range.step));

    log.info({ method: "GET", endpoint: `/servers/${id}/metrics`, metricTypes: types }, "Fetching server metrics");

    const data = await this.fetchWithRateLimit<HetznerMetricsResponse>(
      `/servers/${id}/metrics`,
      { params: params.toString() }
    );

    const series = parseHetznerMetrics(data);
    const durationMs = Math.round(performance.now() - t0);
    const totalPoints = series.reduce((sum, s) => sum + s.dataPoints.length, 0);
    log.info({ method: "GET", endpoint: `/servers/${id}/metrics`, durationMs, status: 200 }, "Fetched server metrics");
    log.debug({ serverId: id, seriesCount: series.length, metricCount: totalPoints }, "Metrics response summary");
    return series;
  }

  async getVolumes(): Promise<VolumeSummary[]> {
    const t0 = performance.now();
    log.info({ method: "GET", endpoint: "/volumes" }, "Fetching volumes");

    const data = await this.fetchWithRateLimit<{ volumes: HetznerVolume[] }>(
      "/volumes"
    );

    const durationMs = Math.round(performance.now() - t0);
    log.info({ method: "GET", endpoint: "/volumes", durationMs, status: 200 }, "Fetched volumes");
    log.debug({ volumeCount: data.volumes.length }, "Volumes response summary");
    return data.volumes.map((v) => ({
      id: String(v.id),
      name: v.name,
      size: v.size,
      serverId: v.server ? String(v.server) : undefined,
      status: mapVolumeStatus(v.status),
    }));
  }

  async getFloatingIps(): Promise<FloatingIpSummary[]> {
    const t0 = performance.now();
    log.info({ method: "GET", endpoint: "/floating_ips" }, "Fetching floating IPs");

    const data = await this.fetchWithRateLimit<{ floating_ips: HetznerFloatingIp[] }>(
      "/floating_ips"
    );

    const durationMs = Math.round(performance.now() - t0);
    log.info({ method: "GET", endpoint: "/floating_ips", durationMs, status: 200 }, "Fetched floating IPs");
    log.debug({ floatingIpCount: data.floating_ips.length }, "Floating IPs response summary");
    return data.floating_ips.map((ip) => ({
      id: String(ip.id),
      ip: ip.ip,
      type: ip.type === "ipv6" ? ("ipv6" as const) : ("ipv4" as const),
      serverId: ip.server ? String(ip.server) : undefined,
      dnsPtr: ip.dns_ptr?.[0]?.dns_ptr,
    }));
  }

  async getLoadBalancers(): Promise<LoadBalancerSummary[]> {
    const t0 = performance.now();
    log.info({ method: "GET", endpoint: "/load_balancers" }, "Fetching load balancers");

    const data = await this.fetchWithRateLimit<{ load_balancers: HetznerLoadBalancer[] }>(
      "/load_balancers"
    );

    const durationMs = Math.round(performance.now() - t0);
    log.info({ method: "GET", endpoint: "/load_balancers", durationMs, status: 200 }, "Fetched load balancers");
    log.debug({ loadBalancerCount: data.load_balancers.length }, "Load balancers response summary");
    return data.load_balancers.map((lb) => ({
      id: String(lb.id),
      name: lb.name,
      publicIpv4: lb.public_net.ipv4?.ip,
      targetCount: lb.targets.length,
      status: "running" as const,
    }));
  }

  async getPricing(): Promise<PricingInfo> {
    const t0 = performance.now();
    log.info({ method: "GET", endpoint: "/pricing" }, "Fetching pricing");

    const data = await this.fetchWithRateLimit<HetznerPricingResponse>(
      "/pricing"
    );

    const durationMs = Math.round(performance.now() - t0);
    log.info({ method: "GET", endpoint: "/pricing", durationMs, status: 200 }, "Fetched pricing");
    log.debug({ serverTypeCount: data.pricing.server_types.length, currency: data.pricing.currency }, "Pricing response summary");

    return {
      serverTypes: data.pricing.server_types.map((st) => {
        const price = st.prices[0];
        return {
          name: st.server_type.name,
          priceHourly: parseFloat(price?.price_hourly?.gross ?? "0"),
          priceMonthly: parseFloat(price?.price_monthly?.gross ?? "0"),
          currency: data.pricing.currency,
        };
      }),
      trafficPerTb: parseFloat(data.pricing.traffic.price_per_tb.gross ?? "0"),
      currency: data.pricing.currency,
    };
  }
}

/* ================================================================
   Mapping Helpers
   ================================================================ */

function mapServerSummary(s: HetznerServer): ServerSummary {
  return {
    id: String(s.id),
    name: s.name,
    status: mapServerStatus(s.status),
    publicIpv4: s.public_net.ipv4?.ip,
    publicIpv6: s.public_net.ipv6?.ip,
    datacenter: s.datacenter?.name,
    serverType: s.server_type.name,
  };
}

/** Formats elapsed time since a date as "Xd Yh Zm". */
function formatUptime(createdAt: Date): string {
  const ms = Date.now() - createdAt.getTime();
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

function mapServerDetail(
  s: HetznerServer,
  volumes: VolumeSummary[]
): ServerDetail {
  const createdAt = new Date(s.created);
  return {
    ...mapServerSummary(s),
    image: s.image?.name,
    createdAt,
    inboundTraffic: s.ingoing_traffic ?? undefined,
    outboundTraffic: s.outgoing_traffic ?? undefined,
    includedTraffic: s.included_traffic ?? undefined,
    volumes,
    uptime: formatUptime(createdAt),
    osVersion: s.image?.description ?? s.image?.name ?? undefined,
  };
}

function mapServerStatus(status: string): ServerSummary["status"] {
  const map: Record<string, ServerSummary["status"]> = {
    running: "running",
    off: "off",
    starting: "starting",
    stopping: "stopping",
  };
  return map[status] ?? "unknown";
}

function mapVolumeStatus(status: string): VolumeSummary["status"] {
  if (status === "available") return "available";
  if (status === "creating") return "creating";
  return "attached";
}

/**
 * Parse Hetzner metrics response into MetricSeries array.
 * Hetzner returns time_series as a map of metric names to value arrays.
 * Each value is [unix_timestamp, string_value].
 */
function parseHetznerMetrics(data: HetznerMetricsResponse): MetricSeries[] {
  const series: MetricSeries[] = [];

  for (const [name, ts] of Object.entries(data.metrics.time_series)) {
    const dataPoints: MetricDataPoint[] = ts.values.map(
      ([timestamp, value]) => ({
        timestamp: new Date(timestamp * 1000),
        value: parseFloat(value),
      })
    );

    series.push({
      name,
      labels: {},
      dataPoints,
    });
  }

  return series;
}

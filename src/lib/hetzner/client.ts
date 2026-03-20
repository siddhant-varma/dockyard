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
import { fetchJSON } from "../http/client";

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

  async listServers(): Promise<ServerSummary[]> {
    const data = await fetchJSON<{ servers: HetznerServer[] }>(
      `${this.baseUrl}/servers`,
      { headers: this.authHeaders }
    );
    return data.servers.map(mapServerSummary);
  }

  async getServer(id: string): Promise<ServerDetail> {
    const data = await fetchJSON<{ server: HetznerServer }>(
      `${this.baseUrl}/servers/${id}`,
      { headers: this.authHeaders }
    );
    const volumes = await this.getVolumes();
    const serverVolumes = volumes.filter((v) => v.serverId === id);
    return mapServerDetail(data.server, serverVolumes);
  }

  async getServerMetrics(
    id: string,
    type: ServerMetricType | ServerMetricType[],
    range: TimeRange
  ): Promise<MetricSeries[]> {
    const types = Array.isArray(type) ? type.join(",") : type;
    const params = new URLSearchParams({
      type: types,
      start: range.start.toISOString(),
      end: range.end.toISOString(),
    });
    if (range.step) params.set("step", String(range.step));

    const data = await fetchJSON<HetznerMetricsResponse>(
      `${this.baseUrl}/servers/${id}/metrics?${params}`,
      { headers: this.authHeaders }
    );

    return parseHetznerMetrics(data);
  }

  async getVolumes(): Promise<VolumeSummary[]> {
    const data = await fetchJSON<{ volumes: HetznerVolume[] }>(
      `${this.baseUrl}/volumes`,
      { headers: this.authHeaders }
    );
    return data.volumes.map((v) => ({
      id: String(v.id),
      name: v.name,
      size: v.size,
      serverId: v.server ? String(v.server) : undefined,
      status: mapVolumeStatus(v.status),
    }));
  }

  async getFloatingIps(): Promise<FloatingIpSummary[]> {
    const data = await fetchJSON<{ floating_ips: HetznerFloatingIp[] }>(
      `${this.baseUrl}/floating_ips`,
      { headers: this.authHeaders }
    );
    return data.floating_ips.map((ip) => ({
      id: String(ip.id),
      ip: ip.ip,
      type: ip.type === "ipv6" ? ("ipv6" as const) : ("ipv4" as const),
      serverId: ip.server ? String(ip.server) : undefined,
      dnsPtr: ip.dns_ptr?.[0]?.dns_ptr,
    }));
  }

  async getLoadBalancers(): Promise<LoadBalancerSummary[]> {
    const data = await fetchJSON<{ load_balancers: HetznerLoadBalancer[] }>(
      `${this.baseUrl}/load_balancers`,
      { headers: this.authHeaders }
    );
    return data.load_balancers.map((lb) => ({
      id: String(lb.id),
      name: lb.name,
      publicIpv4: lb.public_net.ipv4?.ip,
      targetCount: lb.targets.length,
      status: "running" as const,
    }));
  }

  async getPricing(): Promise<PricingInfo> {
    const data = await fetchJSON<HetznerPricingResponse>(
      `${this.baseUrl}/pricing`,
      { headers: this.authHeaders }
    );

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

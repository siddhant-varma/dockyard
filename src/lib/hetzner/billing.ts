/**
 * Hetzner billing calculator.
 *
 * Estimates current month spend by cross-referencing active resources
 * with pricing data. Hetzner's API doesn't expose a direct billing
 * endpoint, so we calculate from: resources x pricing x uptime.
 *
 * @see Roadmap.md §15.2 for Hetzner billing strategy
 */

import type { HetznerClient } from "./client";

/** Calculated billing estimate matching the `billing_estimates` DB schema. */
export interface BillingEstimate {
  periodStart: Date;
  periodEnd: Date;
  serverCost: number;
  volumeCost: number;
  ipCost: number;
  lbCost: number;
  trafficCost: number;
  totalCost: number;
  currency: string;
}

/**
 * Calculate estimated costs for the current billing period.
 *
 * @param client - Authenticated HetznerClient instance
 * @returns Estimated costs broken down by resource type
 */
export async function calculateBilling(
  client: HetznerClient
): Promise<BillingEstimate> {
  const [servers, volumes, floatingIps, loadBalancers, pricing] =
    await Promise.all([
      client.listServers(),
      client.getVolumes(),
      client.getFloatingIps(),
      client.getLoadBalancers(),
      client.getPricing(),
    ]);

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const hoursElapsed = (now.getTime() - periodStart.getTime()) / 3600000;

  // Server costs: hourly rate x hours elapsed this month
  const priceMap = new Map(
    pricing.serverTypes.map((st) => [st.name, st.priceHourly])
  );
  const serverCost = servers.reduce((sum, server) => {
    const hourlyRate = priceMap.get(server.serverType) ?? 0;
    return sum + hourlyRate * hoursElapsed;
  }, 0);

  // Volume costs: ~0.0440 EUR/GB/month (Hetzner standard)
  const volumeCostPerGbMonth = 0.044;
  const monthFraction = hoursElapsed / (24 * periodEnd.getDate());
  const volumeCost = volumes.reduce(
    (sum, v) => sum + v.size * volumeCostPerGbMonth * monthFraction,
    0
  );

  // Floating IP costs: ~4.63 EUR/month each
  const floatingIpMonthly = 4.63;
  const ipCost = floatingIps.length * floatingIpMonthly * monthFraction;

  // Load balancer costs: estimated from pricing (varies by type)
  const lbMonthly = 5.83;
  const lbCost = loadBalancers.length * lbMonthly * monthFraction;

  // Traffic overage: first 20TB included, then pricing per TB
  // (Traffic is tracked per-server via getServer().inboundTraffic/outboundTraffic)
  // For now, assume no overage — detailed tracking is in Phase 2 (P2-HOME-002)
  const trafficCost = 0;

  const totalCost = serverCost + volumeCost + ipCost + lbCost + trafficCost;

  return {
    periodStart,
    periodEnd,
    serverCost: round2(serverCost),
    volumeCost: round2(volumeCost),
    ipCost: round2(ipCost),
    lbCost: round2(lbCost),
    trafficCost: round2(trafficCost),
    totalCost: round2(totalCost),
    currency: pricing.currency,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

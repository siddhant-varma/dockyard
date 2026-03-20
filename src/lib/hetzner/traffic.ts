/**
 * Hetzner traffic usage calculator.
 *
 * Calculates current-month traffic usage for a server by querying the
 * Hetzner Cloud API via the HetznerClient. Computes inbound/outbound
 * totals, included allowance, and overage amounts.
 *
 * Hetzner includes 20 TB of outbound traffic per server per month.
 * Inbound traffic is always free. Overage is billed per TB.
 *
 * @see https://docs.hetzner.cloud/#servers-get-a-server
 */

import type { HetznerClient } from "./client";

/** Bytes-to-terabyte conversion constant. */
const BYTES_PER_TB = 1_000_000_000_000;

/** Bytes-to-gigabyte conversion constant. */
const BYTES_PER_GB = 1_000_000_000;

/** Traffic usage summary for a Hetzner server. */
export interface TrafficUsageSummary {
  /** Hetzner server ID. */
  serverId: string;
  /** Inbound traffic in bytes (always free). */
  inboundBytes: number;
  /** Outbound traffic in bytes. */
  outboundBytes: number;
  /** Included outbound traffic allowance in bytes. */
  includedBytes: number;
  /** Inbound traffic formatted as human-readable string. */
  inboundFormatted: string;
  /** Outbound traffic formatted as human-readable string. */
  outboundFormatted: string;
  /** Included allowance formatted as human-readable string. */
  includedFormatted: string;
  /** Percentage of included outbound allowance used (0-100+). */
  usagePercent: number;
  /** True if outbound traffic exceeds the included allowance. */
  hasOverage: boolean;
  /** Overage amount in bytes (0 if no overage). */
  overageBytes: number;
  /** Overage formatted as human-readable string. */
  overageFormatted: string;
  /** Estimated overage cost based on current pricing. */
  estimatedOverageCost: number;
  /** Currency for the overage cost. */
  currency: string;
}

/**
 * Get the current month's traffic usage for a Hetzner server.
 *
 * Fetches server details from the Hetzner Cloud API to get current
 * traffic counters and included allowance, then calculates usage
 * percentages and potential overage costs.
 *
 * @param client - Authenticated HetznerClient instance
 * @param serverId - Hetzner server ID
 * @returns Traffic usage summary with overage calculations
 */
export async function getTrafficUsage(
  client: HetznerClient,
  serverId: string
): Promise<TrafficUsageSummary> {
  const [server, pricing] = await Promise.all([
    client.getServer(serverId),
    client.getPricing(),
  ]);

  const inboundBytes = server.inboundTraffic ?? 0;
  const outboundBytes = server.outboundTraffic ?? 0;
  const includedBytes = server.includedTraffic ?? 20 * BYTES_PER_TB;

  const overageBytes = Math.max(0, outboundBytes - includedBytes);
  const hasOverage = overageBytes > 0;

  const usagePercent =
    includedBytes > 0
      ? Math.round((outboundBytes / includedBytes) * 10000) / 100
      : 0;

  // Calculate overage cost: price per TB * overage in TB
  const overageTb = overageBytes / BYTES_PER_TB;
  const estimatedOverageCost =
    Math.round(overageTb * pricing.trafficPerTb * 100) / 100;

  return {
    serverId,
    inboundBytes,
    outboundBytes,
    includedBytes,
    inboundFormatted: formatBytes(inboundBytes),
    outboundFormatted: formatBytes(outboundBytes),
    includedFormatted: formatBytes(includedBytes),
    usagePercent,
    hasOverage,
    overageBytes,
    overageFormatted: formatBytes(overageBytes),
    estimatedOverageCost,
    currency: pricing.currency,
  };
}

/**
 * Format a byte count into a human-readable string.
 *
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.23 TB", "456 GB", "78.9 MB")
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  if (bytes >= BYTES_PER_TB) {
    return `${(bytes / BYTES_PER_TB).toFixed(2)} TB`;
  }
  if (bytes >= BYTES_PER_GB) {
    return `${(bytes / BYTES_PER_GB).toFixed(2)} GB`;
  }
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }
  if (bytes >= 1_000) {
    return `${(bytes / 1_000).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

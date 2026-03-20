/**
 * Hetzner billing history service.
 *
 * Queries the billing_estimates table for historical monthly cost data.
 * Used by the dashboard to render billing trend charts and month-over-month
 * comparisons. Each row in billing_estimates represents a calculated snapshot
 * of costs for a specific billing period.
 *
 * Note: Hetzner does not expose a direct billing API endpoint. Billing
 * estimates are calculated by the billing calculator (src/lib/hetzner/billing.ts)
 * and stored periodically by the Inngest billing job.
 */

import { desc, sql } from "drizzle-orm";
import { db } from "@/db/connection";
import { billingEstimates } from "@/db/schema";

/** A single month's billing summary. */
export interface MonthlyBillingSummary {
  /** Start of the billing period. */
  periodStart: Date;
  /** End of the billing period. */
  periodEnd: Date;
  /** Server compute costs. */
  serverCost: number;
  /** Block storage volume costs. */
  volumeCost: number;
  /** Floating IP address costs. */
  ipCost: number;
  /** Load balancer costs. */
  lbCost: number;
  /** Traffic overage costs. */
  trafficCost: number;
  /** Total cost for the period. */
  totalCost: number;
  /** Currency code (e.g., "EUR"). */
  currency: string;
  /** When this estimate was last calculated. */
  calculatedAt: Date;
}

/** Billing trend data for charting. */
export interface BillingTrend {
  /** Array of monthly summaries, newest first. */
  months: MonthlyBillingSummary[];
  /** Average monthly total over the queried period. */
  averageMonthly: number;
  /** Month-over-month change as a percentage (positive = increase). */
  momChangePercent: number | null;
  /** Currency used across all summaries. */
  currency: string;
}

/**
 * Get billing history for the last N months.
 *
 * Queries the billing_estimates table for the most recent estimate
 * per billing period, ordered newest first. Returns monthly totals
 * along with trend calculations.
 *
 * @param months - Number of months to look back (default: 6, max: 24)
 * @returns Billing trend data with monthly summaries
 */
export async function getBillingHistory(months = 6): Promise<BillingTrend> {
  const clampedMonths = Math.min(Math.max(months, 1), 24);

  // Get the most recent billing estimate for each period
  // Using DISTINCT ON (period_start) to get one row per month
  const rows = await db.execute<{
    id: string;
    period_start: Date;
    period_end: Date;
    server_cost: string | null;
    volume_cost: string | null;
    ip_cost: string | null;
    lb_cost: string | null;
    traffic_cost: string | null;
    total_cost: string | null;
    currency: string;
    calculated_at: Date;
  }>(
    sql`
      SELECT DISTINCT ON (period_start)
        id,
        period_start,
        period_end,
        server_cost,
        volume_cost,
        ip_cost,
        lb_cost,
        traffic_cost,
        total_cost,
        currency,
        calculated_at
      FROM ${billingEstimates}
      WHERE period_start >= now() - interval '${sql.raw(String(clampedMonths))} months'
      ORDER BY period_start DESC, calculated_at DESC
    `
  );

  const summaries: MonthlyBillingSummary[] = rows.map((row) => ({
    periodStart: new Date(row.period_start),
    periodEnd: new Date(row.period_end),
    serverCost: Number(row.server_cost ?? 0),
    volumeCost: Number(row.volume_cost ?? 0),
    ipCost: Number(row.ip_cost ?? 0),
    lbCost: Number(row.lb_cost ?? 0),
    trafficCost: Number(row.traffic_cost ?? 0),
    totalCost: Number(row.total_cost ?? 0),
    currency: row.currency,
    calculatedAt: new Date(row.calculated_at),
  }));

  const currency = summaries[0]?.currency ?? "EUR";
  const averageMonthly = calculateAverage(summaries);
  const momChangePercent = calculateMomChange(summaries);

  return {
    months: summaries,
    averageMonthly,
    momChangePercent,
    currency,
  };
}

/**
 * Get the latest billing estimate (current month).
 *
 * @returns Latest billing summary or null if no estimates exist
 */
export async function getLatestBillingEstimate(): Promise<MonthlyBillingSummary | null> {
  const rows = await db
    .select()
    .from(billingEstimates)
    .orderBy(desc(billingEstimates.calculatedAt))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    serverCost: Number(row.serverCost ?? 0),
    volumeCost: Number(row.volumeCost ?? 0),
    ipCost: Number(row.ipCost ?? 0),
    lbCost: Number(row.lbCost ?? 0),
    trafficCost: Number(row.trafficCost ?? 0),
    totalCost: Number(row.totalCost ?? 0),
    currency: row.currency,
    calculatedAt: row.calculatedAt,
  };
}

/**
 * Calculate the average monthly total across a set of billing summaries.
 */
function calculateAverage(summaries: MonthlyBillingSummary[]): number {
  if (summaries.length === 0) return 0;
  const total = summaries.reduce((sum, s) => sum + s.totalCost, 0);
  return Math.round((total / summaries.length) * 100) / 100;
}

/**
 * Calculate month-over-month percentage change between the two most
 * recent billing periods.
 *
 * @returns Percentage change (positive = increase), or null if insufficient data
 */
function calculateMomChange(
  summaries: MonthlyBillingSummary[]
): number | null {
  if (summaries.length < 2) return null;

  const current = summaries[0].totalCost;
  const previous = summaries[1].totalCost;

  if (previous === 0) return current > 0 ? 100 : 0;

  const change = ((current - previous) / previous) * 100;
  return Math.round(change * 100) / 100;
}

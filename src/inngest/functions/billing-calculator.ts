/**
 * Billing estimate calculator worker.
 *
 * Runs every 6 hours. Calculates estimated Hetzner Cloud costs
 * for the current billing period and stores the result.
 */

import { eq, sql } from "drizzle-orm";
import { inngest } from "../client";
import { HetznerClient } from "@/lib/hetzner/client";
import { calculateBilling } from "@/lib/hetzner/billing";
import { db } from "@/db/connection";
import { billingEstimates } from "@/db/schema";

export const billingCalculator = inngest.createFunction(
  {
    id: "billing-calculator",
    name: "Billing Estimate Calculator",
    triggers: [{ cron: "0 */6 * * *" }],
  },
  async ({ step }) => {
    const apiToken = process.env.HETZNER_API_TOKEN;
    if (!apiToken) {
      return { message: "HETZNER_API_TOKEN not configured" };
    }

    // Calculate and store in one step to avoid Date serialization
    const result = await step.run("calculate-and-store", async () => {
      const client = new HetznerClient(apiToken);
      const estimate = await calculateBilling(client);

      // Find existing estimate for current month
      const existing = await db.query.billingEstimates.findFirst({
        where: sql`${billingEstimates.periodStart} >= ${estimate.periodStart} AND ${billingEstimates.periodEnd} <= ${estimate.periodEnd}`,
      });

      if (existing) {
        await db
          .update(billingEstimates)
          .set({
            serverCost: String(estimate.serverCost),
            volumeCost: String(estimate.volumeCost),
            ipCost: String(estimate.ipCost),
            lbCost: String(estimate.lbCost),
            trafficCost: String(estimate.trafficCost),
            totalCost: String(estimate.totalCost),
            calculatedAt: new Date(),
          })
          .where(eq(billingEstimates.id, existing.id));
      } else {
        await db.insert(billingEstimates).values({
          periodStart: estimate.periodStart,
          periodEnd: estimate.periodEnd,
          serverCost: String(estimate.serverCost),
          volumeCost: String(estimate.volumeCost),
          ipCost: String(estimate.ipCost),
          lbCost: String(estimate.lbCost),
          trafficCost: String(estimate.trafficCost),
          totalCost: String(estimate.totalCost),
          currency: estimate.currency,
        });
      }

      return { totalCost: estimate.totalCost, currency: estimate.currency };
    });

    return result;
  }
);

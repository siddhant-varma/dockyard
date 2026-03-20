/**
 * SLO budget recalculation worker.
 *
 * Runs every 5 minutes via cron. Loads all active SLOs across all projects,
 * recalculates budget remaining and burn rate for each, and emits
 * `dockyard/slo.budget.updated` events for downstream consumers (SSE, alerts).
 */

import { inngest } from "../client";
import { db } from "@/db/connection";
import { calculateBudget } from "@/lib/slo/calculator";
import { evaluateBurnRateAlerts } from "@/lib/alerts/burn-rate";
import { notifySSE } from "@/lib/sse/notify";

export const sloCalculator = inngest.createFunction(
  {
    id: "slo-calculator",
    name: "SLO Budget Calculator",
    triggers: [{ cron: "*/5 * * * *" }],
  },
  async ({ step }) => {
    const slos = await step.run("load-active-slos", async () => {
      return db.query.sloBudgets.findMany();
    });

    if (slos.length === 0) {
      return { slosProcessed: 0, alertsFired: 0 };
    }

    const budgets = await step.run("recalculate-budgets", async () => {
      const results = [];
      for (const slo of slos) {
        const budget = await calculateBudget(slo.id);
        if (budget) results.push(budget);
      }
      return results;
    });

    const projectIds = [...new Set(budgets.map((b) => b.projectId))];

    const alertResults = await step.run(
      "evaluate-burn-rate-alerts",
      async () => {
        const results = [];
        for (const projectId of projectIds) {
          const result = await evaluateBurnRateAlerts(projectId);
          results.push(result);
        }
        return results;
      }
    );

    await step.run("broadcast-updates", async () => {
      for (const budget of budgets) {
        await notifySSE("slo.budget.updated", {
          projectId: budget.projectId,
          sloId: budget.sloId,
          metricName: budget.metricName,
          budgetRemaining: budget.budgetRemaining,
          burnRate: budget.burnRate,
          timestamp: new Date().toISOString(),
        });
      }
    });

    return {
      slosProcessed: budgets.length,
      alertsFired: alertResults.reduce((sum, r) => sum + r.alertsFired, 0),
    };
  }
);

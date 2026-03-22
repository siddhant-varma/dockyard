/**
 * Tests for the SLO burn-rate alert engine.
 *
 * Verifies that burn-rate thresholds are correctly applied
 * following Google's multi-window standard:
 *   >14.4x = SEV1, >6x = SEV2, >3x = SEV3
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildSLO } from "../../../test/helpers/fixtures";

vi.mock("@/db/connection", () => ({
  db: {
    query: {
      sloBudgets: { findMany: vi.fn() },
      alertRules: { findFirst: vi.fn() },
    },
    insert: vi.fn(),
  },
}));

vi.mock("@/lib/slo/calculator", () => ({
  calculateBudget: vi.fn(),
}));

import { evaluateBurnRateAlerts } from "./burn-rate";
import { db } from "@/db/connection";
import { calculateBudget } from "@/lib/slo/calculator";

const mockDb = vi.mocked(db);
const mockCalculateBudget = vi.mocked(calculateBudget);

describe("evaluateBurnRateAlerts", () => {
  const projectId = "proj-001";

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: getOrCreateBurnRateRule returns an existing rule
    mockDb.query.alertRules.findFirst.mockResolvedValue({
      id: "burn-rule-1",
    } as never);

    // Default: insert succeeds
    const mockValues = vi.fn().mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({ values: mockValues } as never);
  });

  it("triggers SEV1 when burn rate exceeds 14.4x", async () => {
    const slo = buildSLO({ id: "slo-avail", projectId, metricName: "availability" });
    mockDb.query.sloBudgets.findMany.mockResolvedValue([slo]);
    mockCalculateBudget.mockResolvedValue({
      sloId: "slo-avail",
      projectId,
      metricName: "availability",
      targetValue: 99.9,
      currentValue: 98.0,
      budgetRemaining: -200,
      burnRate: 15.0,
      windowDays: 30,
      calculatedAt: new Date(),
    });

    const result = await evaluateBurnRateAlerts(projectId);

    expect(result.alertsFired).toBe(1);
    expect(result.alerts[0].severity).toBe("sev1");
    expect(result.alerts[0].burnRate).toBe(15.0);
  });

  it("triggers SEV2 when burn rate is between 6x and 14.4x", async () => {
    const slo = buildSLO({ id: "slo-avail", projectId, metricName: "availability" });
    mockDb.query.sloBudgets.findMany.mockResolvedValue([slo]);
    mockCalculateBudget.mockResolvedValue({
      sloId: "slo-avail",
      projectId,
      metricName: "availability",
      targetValue: 99.9,
      currentValue: 99.0,
      budgetRemaining: 10,
      burnRate: 8.0,
      windowDays: 30,
      calculatedAt: new Date(),
    });

    const result = await evaluateBurnRateAlerts(projectId);

    expect(result.alertsFired).toBe(1);
    expect(result.alerts[0].severity).toBe("sev2");
  });

  it("triggers SEV3 when burn rate is between 3x and 6x", async () => {
    const slo = buildSLO({ id: "slo-avail", projectId, metricName: "availability" });
    mockDb.query.sloBudgets.findMany.mockResolvedValue([slo]);
    mockCalculateBudget.mockResolvedValue({
      sloId: "slo-avail",
      projectId,
      metricName: "availability",
      targetValue: 99.9,
      currentValue: 99.5,
      budgetRemaining: 40,
      burnRate: 4.0,
      windowDays: 30,
      calculatedAt: new Date(),
    });

    const result = await evaluateBurnRateAlerts(projectId);

    expect(result.alertsFired).toBe(1);
    expect(result.alerts[0].severity).toBe("sev3");
  });

  it("does not fire when burn rate is below 3x (normal consumption)", async () => {
    const slo = buildSLO({ id: "slo-avail", projectId, metricName: "availability" });
    mockDb.query.sloBudgets.findMany.mockResolvedValue([slo]);
    mockCalculateBudget.mockResolvedValue({
      sloId: "slo-avail",
      projectId,
      metricName: "availability",
      targetValue: 99.9,
      currentValue: 99.85,
      budgetRemaining: 50,
      burnRate: 1.0,
      windowDays: 30,
      calculatedAt: new Date(),
    });

    const result = await evaluateBurnRateAlerts(projectId);

    expect(result.alertsFired).toBe(0);
    expect(result.alerts).toHaveLength(0);
  });

  it("skips SLOs where calculateBudget returns null", async () => {
    const slo = buildSLO({ id: "slo-missing", projectId });
    mockDb.query.sloBudgets.findMany.mockResolvedValue([slo]);
    mockCalculateBudget.mockResolvedValue(null);

    const result = await evaluateBurnRateAlerts(projectId);

    expect(result.slosEvaluated).toBe(1);
    expect(result.alertsFired).toBe(0);
  });

  it("returns correct slosEvaluated count for multiple SLOs", async () => {
    const slo1 = buildSLO({ id: "slo-1", projectId, metricName: "availability" });
    const slo2 = buildSLO({ id: "slo-2", projectId, metricName: "latency_p99" });
    const slo3 = buildSLO({ id: "slo-3", projectId, metricName: "error_rate" });

    mockDb.query.sloBudgets.findMany.mockResolvedValue([slo1, slo2, slo3]);

    // Only slo-1 has high burn rate, others are normal
    mockCalculateBudget
      .mockResolvedValueOnce({
        sloId: "slo-1",
        projectId,
        metricName: "availability",
        targetValue: 99.9,
        currentValue: 95.0,
        budgetRemaining: -400,
        burnRate: 20.0,
        windowDays: 30,
        calculatedAt: new Date(),
      })
      .mockResolvedValueOnce({
        sloId: "slo-2",
        projectId,
        metricName: "latency_p99",
        targetValue: 200,
        currentValue: 150,
        budgetRemaining: 75,
        burnRate: 0.5,
        windowDays: 30,
        calculatedAt: new Date(),
      })
      .mockResolvedValueOnce({
        sloId: "slo-3",
        projectId,
        metricName: "error_rate",
        targetValue: 1.0,
        currentValue: 0.8,
        budgetRemaining: 80,
        burnRate: 0.2,
        windowDays: 30,
        calculatedAt: new Date(),
      });

    const result = await evaluateBurnRateAlerts(projectId);

    expect(result.slosEvaluated).toBe(3);
    expect(result.alertsFired).toBe(1);
    expect(result.alerts[0].severity).toBe("sev1");
  });

  it("returns empty result when project has no SLOs", async () => {
    mockDb.query.sloBudgets.findMany.mockResolvedValue([]);

    const result = await evaluateBurnRateAlerts(projectId);

    expect(result.slosEvaluated).toBe(0);
    expect(result.alertsFired).toBe(0);
    expect(result.alerts).toHaveLength(0);
  });

  it("fires the highest matching threshold (SEV1 over SEV2 for burn rate at exactly 14.4)", async () => {
    const slo = buildSLO({ id: "slo-exact", projectId, metricName: "availability" });
    mockDb.query.sloBudgets.findMany.mockResolvedValue([slo]);
    mockCalculateBudget.mockResolvedValue({
      sloId: "slo-exact",
      projectId,
      metricName: "availability",
      targetValue: 99.9,
      currentValue: 98.0,
      budgetRemaining: -100,
      burnRate: 14.4,
      windowDays: 30,
      calculatedAt: new Date(),
    });

    const result = await evaluateBurnRateAlerts(projectId);

    // THRESHOLDS array is ordered SEV1 first, so 14.4 >= 14.4 matches SEV1
    expect(result.alerts[0].severity).toBe("sev1");
  });

  it("includes the SLO metric name in the alert message", async () => {
    const slo = buildSLO({ id: "slo-msg", projectId, metricName: "error_rate" });
    mockDb.query.sloBudgets.findMany.mockResolvedValue([slo]);
    mockCalculateBudget.mockResolvedValue({
      sloId: "slo-msg",
      projectId,
      metricName: "error_rate",
      targetValue: 1.0,
      currentValue: 5.0,
      budgetRemaining: -300,
      burnRate: 10.0,
      windowDays: 30,
      calculatedAt: new Date(),
    });

    const result = await evaluateBurnRateAlerts(projectId);

    expect(result.alerts[0].message).toContain("error_rate");
    expect(result.alerts[0].message).toContain("10");
    expect(result.alerts[0].metricName).toBe("error_rate");
  });
});

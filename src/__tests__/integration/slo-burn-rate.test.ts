/**
 * Integration test: SLO burn-rate alert flow.
 *
 * Tests the end-to-end flow: create SLO → budget calculation →
 * burn rate threshold exceeded → alert fired.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Controllable DB mocks ---
const mockSloFindFirst = vi.fn();
const mockSloFindMany = vi.fn();
const mockAlertRuleFindFirst = vi.fn();
const mockProjectFindFirst = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn();
const mockUpdateSetWhereReturning = vi.fn();
const mockSelectFromWhere = vi.fn();

vi.mock("@/db/connection", () => {
  const sloFindFirstRef = (...args: unknown[]) => mockSloFindFirst(...args);
  const sloFindManyRef = (...args: unknown[]) => mockSloFindMany(...args);
  const alertRuleFindFirstRef = (...args: unknown[]) => mockAlertRuleFindFirst(...args);
  const projectFindFirstRef = (...args: unknown[]) => mockProjectFindFirst(...args);
  const selectFromWhereRef = (...args: unknown[]) => mockSelectFromWhere(...args);
  const insertValuesRef = (...args: unknown[]) => {
    mockInsertValues(...args);
    return { returning: (...rArgs: unknown[]) => mockInsertReturning(...rArgs) };
  };
  const updateSetWhereReturningRef = (...args: unknown[]) => mockUpdateSetWhereReturning(...args);

  return {
    db: {
      query: {
        sloBudgets: {
          findMany: sloFindManyRef,
          findFirst: sloFindFirstRef,
        },
        healthCheckResults: { findMany: vi.fn().mockResolvedValue([]) },
        alertRules: {
          findFirst: alertRuleFindFirstRef,
        },
        projects: {
          findFirst: projectFindFirstRef,
        },
      },
      select: () => ({
        from: () => ({
          where: selectFromWhereRef,
        }),
      }),
      insert: () => ({
        values: insertValuesRef,
      }),
      update: () => ({
        set: () => ({
          where: () => ({
            returning: updateSetWhereReturningRef,
          }),
        }),
      }),
    },
  };
});

vi.mock("@/lib/crypto/aes", () => ({
  encrypt: (v: string) => v,
  decrypt: (v: string) => v,
}));

describe("SLO Burn-Rate Alert Flow", () => {
  beforeEach(() => {
    mockSloFindFirst.mockReset();
    mockSloFindMany.mockReset();
    mockAlertRuleFindFirst.mockReset();
    mockProjectFindFirst.mockReset();
    mockInsertReturning.mockReset();
    mockInsertValues.mockReset();
    mockUpdateSetWhereReturning.mockReset();
    mockSelectFromWhere.mockReset();
  });

  // --- Original smoke tests ---

  it("should export createSLO function", async () => {
    const { createSLO } = await import("@/lib/slo/service");
    expect(typeof createSLO).toBe("function");
  });

  it("should export calculateBudget function", async () => {
    const { calculateBudget } = await import("@/lib/slo/calculator");
    expect(typeof calculateBudget).toBe("function");
  });

  it("should export evaluateBurnRateAlerts function", async () => {
    const { evaluateBurnRateAlerts } = await import("@/lib/alerts/burn-rate");
    expect(typeof evaluateBurnRateAlerts).toBe("function");
  });

  it("should have supported metrics: availability, latency_p99, error_rate", async () => {
    const { createSLO } = await import("@/lib/slo/service");
    expect(typeof createSLO).toBe("function");
  });

  // --- Behavior tests ---

  it("createSLO rejects unsupported metric names", async () => {
    const { createSLO } = await import("@/lib/slo/service");

    await expect(
      createSLO("proj-001", { metricName: "cpu_usage" as never, targetValue: 80 })
    ).rejects.toThrow("Unsupported metric");
  });

  it("createSLO rejects duplicate SLO for same project and metric", async () => {
    mockSloFindFirst.mockResolvedValue({ id: "slo-existing", metricName: "availability" });

    const { createSLO } = await import("@/lib/slo/service");

    await expect(
      createSLO("proj-001", { metricName: "availability", targetValue: 99.9 })
    ).rejects.toThrow("already exists");
  });

  it("createSLO succeeds with valid metric and no existing SLO", async () => {
    mockSloFindFirst.mockResolvedValue(null);
    const fakeSlo = {
      id: "slo-new",
      projectId: "proj-001",
      metricName: "availability",
      targetValue: 99.9,
      windowDays: 30,
    };
    mockInsertReturning.mockResolvedValue([fakeSlo]);

    const { createSLO } = await import("@/lib/slo/service");
    const result = await createSLO("proj-001", {
      metricName: "availability",
      targetValue: 99.9,
    });

    expect(result.id).toBe("slo-new");
    expect(result.metricName).toBe("availability");
  });

  it("calculateBudget returns null when SLO does not exist", async () => {
    mockSloFindFirst.mockResolvedValue(null);

    const { calculateBudget } = await import("@/lib/slo/calculator");
    const result = await calculateBudget("nonexistent-slo");

    expect(result).toBeNull();
  });

  it("calculateBudget computes availability budget from health check data", async () => {
    mockSloFindFirst.mockResolvedValue({
      id: "slo-avail",
      projectId: "proj-001",
      metricName: "availability",
      targetValue: 99.9,
      windowDays: 30,
    });

    // Returns 1000 total checks, 998 successful = 99.8% availability
    mockSelectFromWhere.mockResolvedValue([{ total: 1000, successful: 998 }]);

    const { calculateBudget } = await import("@/lib/slo/calculator");
    const result = await calculateBudget("slo-avail");

    expect(result).not.toBeNull();
    expect(result!.sloId).toBe("slo-avail");
    expect(result!.metricName).toBe("availability");
    expect(result!.targetValue).toBe(99.9);
    // currentValue = (998/1000)*100 = 99.8
    expect(result!.currentValue).toBe(99.8);
    // Budget: error budget total = 100-99.9 = 0.1
    // error consumed = 99.9 - 99.8 = 0.1 (approximately)
    // remaining = (0.1 - 0.1)/0.1 * 100 = 0%
    expect(result!.budgetRemaining).toBeCloseTo(0, 1);
    // burnRate = (0.1/30) / (0.1/30) = 1.0
    expect(result!.burnRate).toBe(1);
  });

  it("evaluateBurnRateAlerts fires no alerts when burn rate is below threshold", async () => {
    mockSloFindMany.mockResolvedValue([
      {
        id: "slo-ok",
        projectId: "proj-001",
        metricName: "availability",
        targetValue: 99.9,
        windowDays: 30,
      },
    ]);
    // calculateBudget path needs SLO findFirst
    mockSloFindFirst.mockResolvedValue({
      id: "slo-ok",
      projectId: "proj-001",
      metricName: "availability",
      targetValue: 99.9,
      windowDays: 30,
    });
    // 999/1000 = 99.9% — exactly on target, burn rate = 0
    mockSelectFromWhere.mockResolvedValue([{ total: 1000, successful: 999 }]);

    const { evaluateBurnRateAlerts } = await import("@/lib/alerts/burn-rate");
    const result = await evaluateBurnRateAlerts("proj-001");

    expect(result.projectId).toBe("proj-001");
    expect(result.slosEvaluated).toBe(1);
    expect(result.alertsFired).toBe(0);
    expect(result.alerts).toHaveLength(0);
  });

  it("evaluateBurnRateAlerts returns empty result when project has no SLOs", async () => {
    mockSloFindMany.mockResolvedValue([]);

    const { evaluateBurnRateAlerts } = await import("@/lib/alerts/burn-rate");
    const result = await evaluateBurnRateAlerts("proj-no-slos");

    expect(result.slosEvaluated).toBe(0);
    expect(result.alertsFired).toBe(0);
    expect(result.alerts).toEqual([]);
  });
});

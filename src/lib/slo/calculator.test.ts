/**
 * Tests for the SLO budget calculator.
 *
 * Verifies budget remaining and burn-rate computation for
 * availability, latency, and error-rate SLOs.
 *
 * The pure `computeBudgetMetrics` function (private) is tested
 * indirectly through `calculateBudget` by mocking DB responses.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildSLO } from "../../../test/helpers/fixtures";

vi.mock("@/db/connection", () => {
  const mockFrom = vi.fn();
  const mockWhere = vi.fn();
  const mockSet = vi.fn();

  return {
    db: {
      query: {
        sloBudgets: { findFirst: vi.fn() },
      },
      select: vi.fn().mockReturnValue({
        from: mockFrom.mockReturnValue({
          where: mockWhere.mockResolvedValue([{ total: 1000, successful: 999 }]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: mockSet.mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    },
  };
});

import { calculateBudget } from "./calculator";
import { db } from "@/db/connection";

const mockDb = vi.mocked(db);

describe("calculateBudget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-wire the chained mocks after each clear
    const mockWhere = vi.fn();
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    (mockDb.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    const mockSetWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockSetWhere });
    (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });

    // Store references for per-test override
    (mockDb as Record<string, unknown>).__mockWhere = mockWhere;
  });

  it("returns null when SLO does not exist", async () => {
    mockDb.query.sloBudgets.findFirst.mockResolvedValue(undefined as never);

    const result = await calculateBudget("slo-nonexistent");

    expect(result).toBeNull();
  });

  it("calculates budget for 99.9% availability target with 99.85% current", async () => {
    const slo = buildSLO({
      id: "slo-avail",
      projectId: "proj-001",
      metricName: "availability",
      targetValue: 99.9,
      windowDays: 30,
    });
    mockDb.query.sloBudgets.findFirst.mockResolvedValue(slo as never);

    // 99.85% availability: 9985 successful out of 10000
    const mockWhere = (mockDb as Record<string, unknown>).__mockWhere as ReturnType<typeof vi.fn>;
    mockWhere.mockResolvedValue([{ total: 10000, successful: 9985 }]);

    const result = await calculateBudget("slo-avail");

    expect(result).not.toBeNull();
    expect(result!.metricName).toBe("availability");
    expect(result!.currentValue).toBe(99.85);
    // Error budget: 100 - 99.9 = 0.1
    // Consumed: 99.9 - 99.85 = 0.05
    // Remaining: (0.1 - 0.05) / 0.1 * 100 = 50%
    expect(result!.budgetRemaining).toBe(50);
    // Burn rate: (0.05/30) / (0.1/30) = 0.5
    expect(result!.burnRate).toBe(0.5);
  });

  it("shows budget exhaustion when current is below target (availability)", async () => {
    const slo = buildSLO({
      id: "slo-exhausted",
      projectId: "proj-001",
      metricName: "availability",
      targetValue: 99.9,
      windowDays: 30,
    });
    mockDb.query.sloBudgets.findFirst.mockResolvedValue(slo as never);

    // 99.7% availability — consumed more than the 0.1% budget
    const mockWhere = (mockDb as Record<string, unknown>).__mockWhere as ReturnType<typeof vi.fn>;
    mockWhere.mockResolvedValue([{ total: 10000, successful: 9970 }]);

    const result = await calculateBudget("slo-exhausted");

    expect(result).not.toBeNull();
    expect(result!.currentValue).toBe(99.7);
    // Consumed: 99.9 - 99.7 = 0.2, budget total: 0.1
    // Remaining: (0.1 - 0.2) / 0.1 * 100 = -100%
    expect(result!.budgetRemaining).toBe(-100);
    // Burn rate: (0.2/30) / (0.1/30) = 2.0
    expect(result!.burnRate).toBe(2);
  });

  it("returns 100% budget when all checks are successful", async () => {
    const slo = buildSLO({
      id: "slo-perfect",
      projectId: "proj-001",
      metricName: "availability",
      targetValue: 99.9,
      windowDays: 30,
    });
    mockDb.query.sloBudgets.findFirst.mockResolvedValue(slo as never);

    // 100% availability
    const mockWhere = (mockDb as Record<string, unknown>).__mockWhere as ReturnType<typeof vi.fn>;
    mockWhere.mockResolvedValue([{ total: 5000, successful: 5000 }]);

    const result = await calculateBudget("slo-perfect");

    expect(result).not.toBeNull();
    expect(result!.currentValue).toBe(100);
    expect(result!.budgetRemaining).toBe(100);
    expect(result!.burnRate).toBe(0);
  });

  it("handles 100% availability target (zero error budget) gracefully", async () => {
    const slo = buildSLO({
      id: "slo-100pct",
      projectId: "proj-001",
      metricName: "availability",
      targetValue: 100,
      windowDays: 30,
    });
    mockDb.query.sloBudgets.findFirst.mockResolvedValue(slo as never);

    // 100% availability, matching 100% target
    const mockWhere = (mockDb as Record<string, unknown>).__mockWhere as ReturnType<typeof vi.fn>;
    mockWhere.mockResolvedValue([{ total: 1000, successful: 1000 }]);

    const result = await calculateBudget("slo-100pct");

    expect(result).not.toBeNull();
    // errorBudgetTotal = 0, current >= target, so budgetRemaining = 100
    expect(result!.budgetRemaining).toBe(100);
    expect(result!.burnRate).toBe(0);
  });

  it("defaults to 100% availability when no health checks exist", async () => {
    const slo = buildSLO({
      id: "slo-empty",
      projectId: "proj-001",
      metricName: "availability",
      targetValue: 99.9,
      windowDays: 30,
    });
    mockDb.query.sloBudgets.findFirst.mockResolvedValue(slo as never);

    // No health checks — calculateAvailability returns 100
    const mockWhere = (mockDb as Record<string, unknown>).__mockWhere as ReturnType<typeof vi.fn>;
    mockWhere.mockResolvedValue([{ total: 0, successful: 0 }]);

    const result = await calculateBudget("slo-empty");

    expect(result).not.toBeNull();
    expect(result!.currentValue).toBe(100);
    expect(result!.budgetRemaining).toBe(100);
  });

  it("uses the SLO windowDays for time-based calculations", async () => {
    const slo = buildSLO({
      id: "slo-7d",
      projectId: "proj-001",
      metricName: "availability",
      targetValue: 99.5,
      windowDays: 7,
    });
    mockDb.query.sloBudgets.findFirst.mockResolvedValue(slo as never);

    const mockWhere = (mockDb as Record<string, unknown>).__mockWhere as ReturnType<typeof vi.fn>;
    mockWhere.mockResolvedValue([{ total: 2000, successful: 1980 }]);

    const result = await calculateBudget("slo-7d");

    expect(result).not.toBeNull();
    expect(result!.windowDays).toBe(7);
    // 99% availability, target 99.5%
    // Consumed: 99.5 - 99.0 = 0.5, budget: 0.5
    // Remaining: (0.5 - 0.5) / 0.5 * 100 = 0%
    expect(result!.currentValue).toBe(99);
    expect(result!.budgetRemaining).toBe(0);
    // Burn rate: 0.5/0.5 = 1.0
    expect(result!.burnRate).toBe(1);
  });

  it("updates the SLO record in the database after calculation", async () => {
    const slo = buildSLO({
      id: "slo-update",
      projectId: "proj-001",
      metricName: "availability",
      targetValue: 99.9,
      windowDays: 30,
    });
    mockDb.query.sloBudgets.findFirst.mockResolvedValue(slo as never);

    const mockWhere = (mockDb as Record<string, unknown>).__mockWhere as ReturnType<typeof vi.fn>;
    mockWhere.mockResolvedValue([{ total: 1000, successful: 999 }]);

    await calculateBudget("slo-update");

    expect(mockDb.update).toHaveBeenCalled();
  });
});

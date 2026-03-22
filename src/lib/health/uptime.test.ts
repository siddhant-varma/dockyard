/**
 * Tests for uptime percentage calculation.
 *
 * Verifies uptime computation from health check results,
 * covering 100%, partial, 0%, and empty scenarios.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/connection", () => {
  const mockWhere = vi.fn();
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });

  return {
    db: {
      select: vi.fn().mockReturnValue({ from: mockFrom }),
      execute: vi.fn(),
      query: {},
    },
  };
});

import { calculateUptime, getUptimeBuckets } from "./uptime";
import { db } from "@/db/connection";

const mockDb = vi.mocked(db);

/** Helper to set the mock DB response for calculateUptime queries. */
function mockUptimeQuery(total: number, successful: number) {
  const mockWhere = vi.fn().mockResolvedValue([{ total, successful }]);
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  (mockDb.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });
}

describe("calculateUptime", () => {
  const projectId = "proj-001";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 100% when all checks are healthy", async () => {
    mockUptimeQuery(1000, 1000);

    const result = await calculateUptime(projectId);

    expect(result.percentage).toBe(100);
    expect(result.totalChecks).toBe(1000);
    expect(result.successfulChecks).toBe(1000);
  });

  it("returns 95% when 5% of checks are unhealthy", async () => {
    mockUptimeQuery(1000, 950);

    const result = await calculateUptime(projectId);

    expect(result.percentage).toBe(95);
    expect(result.totalChecks).toBe(1000);
    expect(result.successfulChecks).toBe(950);
  });

  it("returns 0% when all checks are unhealthy", async () => {
    mockUptimeQuery(500, 0);

    const result = await calculateUptime(projectId);

    expect(result.percentage).toBe(0);
    expect(result.totalChecks).toBe(500);
    expect(result.successfulChecks).toBe(0);
  });

  it("returns 100% when there are no health check results", async () => {
    mockUptimeQuery(0, 0);

    const result = await calculateUptime(projectId);

    // No data defaults to 100% (assume healthy until proven otherwise)
    expect(result.percentage).toBe(100);
    expect(result.totalChecks).toBe(0);
    expect(result.successfulChecks).toBe(0);
  });

  it("uses the specified window days parameter", async () => {
    mockUptimeQuery(200, 190);

    const result = await calculateUptime(projectId, 7);

    expect(result.windowDays).toBe(7);
    expect(result.percentage).toBe(95);
  });

  it("defaults to 30-day window when no days parameter is given", async () => {
    mockUptimeQuery(100, 100);

    const result = await calculateUptime(projectId);

    expect(result.windowDays).toBe(30);
  });

  it("calculates precise uptime with decimal places", async () => {
    // 9997 of 10000 = 99.97%
    mockUptimeQuery(10000, 9997);

    const result = await calculateUptime(projectId);

    expect(result.percentage).toBe(99.97);
  });

  it("handles a single check (edge case)", async () => {
    mockUptimeQuery(1, 1);

    const result = await calculateUptime(projectId);

    expect(result.percentage).toBe(100);
    expect(result.totalChecks).toBe(1);
  });

  it("handles a single failed check", async () => {
    mockUptimeQuery(1, 0);

    const result = await calculateUptime(projectId);

    expect(result.percentage).toBe(0);
    expect(result.totalChecks).toBe(1);
  });
});

describe("getUptimeBuckets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns hourly uptime buckets from DB results", async () => {
    const now = new Date("2026-03-22T12:00:00Z");
    (mockDb.execute as ReturnType<typeof vi.fn>).mockResolvedValue([
      { bucket: now.toISOString(), total: "100", successful: "98" },
      {
        bucket: new Date("2026-03-22T11:00:00Z").toISOString(),
        total: "100",
        successful: "100",
      },
    ]);

    const buckets = await getUptimeBuckets("proj-001", 24);

    expect(buckets).toHaveLength(2);
    expect(buckets[0].uptimePercent).toBe(98);
    expect(buckets[1].uptimePercent).toBe(100);
  });

  it("returns empty array when no data exists", async () => {
    (mockDb.execute as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const buckets = await getUptimeBuckets("proj-001");

    expect(buckets).toHaveLength(0);
  });
});

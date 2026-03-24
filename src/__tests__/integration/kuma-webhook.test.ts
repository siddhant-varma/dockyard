/**
 * Integration test: Kuma webhook payload normalization and adapter.
 *
 * Tests: webhook payload parsing, Kuma-to-HealthSummary transformation,
 * status mapping, monitor aggregation, and backward compatibility.
 */

import { describe, it, expect } from "vitest";

describe("Kuma Adapter", () => {
  it("should export kumaToHealthSummary", async () => {
    const { kumaToHealthSummary } = await import("@/lib/kuma/adapter");
    expect(typeof kumaToHealthSummary).toBe("function");
  });

  it("should export isKumaConfigured", async () => {
    const { isKumaConfigured } = await import("@/lib/kuma/adapter");
    expect(typeof isKumaConfigured).toBe("function");
  });

  it("should transform an up monitor to healthy HealthSummary", async () => {
    const { kumaToHealthSummary } = await import("@/lib/kuma/adapter");
    const monitor = createMockMonitor({ status: 1, name: "Test API" });

    const result = kumaToHealthSummary(monitor);

    expect(result.status).toBe("healthy");
    expect(result.projectName).toBe("Test API");
    expect(result.slug).toBe("test-api");
    expect(result.source).toBe("kuma");
  });

  it("should transform a down monitor to down HealthSummary", async () => {
    const { kumaToHealthSummary } = await import("@/lib/kuma/adapter");
    const monitor = createMockMonitor({ status: 0 });

    const result = kumaToHealthSummary(monitor);

    expect(result.status).toBe("down");
  });

  it("should transform a pending monitor to unknown HealthSummary", async () => {
    const { kumaToHealthSummary } = await import("@/lib/kuma/adapter");
    const monitor = createMockMonitor({ status: 2 });

    const result = kumaToHealthSummary(monitor);

    expect(result.status).toBe("unknown");
  });

  it("should transform a maintenance monitor to degraded HealthSummary", async () => {
    const { kumaToHealthSummary } = await import("@/lib/kuma/adapter");
    const monitor = createMockMonitor({ status: 3 });

    const result = kumaToHealthSummary(monitor);

    expect(result.status).toBe("degraded");
  });

  it("should map uptime720 to uptime30d", async () => {
    const { kumaToHealthSummary } = await import("@/lib/kuma/adapter");
    const monitor = createMockMonitor({ uptime720: 99.94 });

    const result = kumaToHealthSummary(monitor);

    expect(result.uptime30d).toBe(99.94);
  });

  it("should map avgPing to latencyMs", async () => {
    const { kumaToHealthSummary } = await import("@/lib/kuma/adapter");
    const monitor = createMockMonitor({ avgPing: 42 });

    const result = kumaToHealthSummary(monitor);

    expect(result.latencyMs).toBe(42);
  });

  it("should handle null uptime and latency", async () => {
    const { kumaToHealthSummary } = await import("@/lib/kuma/adapter");
    const monitor = createMockMonitor({
      uptime720: undefined,
      avgPing: undefined,
    });

    const result = kumaToHealthSummary(monitor);

    expect(result.uptime30d).toBeNull();
    expect(result.latencyMs).toBeNull();
  });
});

describe("Kuma Monitor Aggregation", () => {
  it("should aggregate multiple monitors into one HealthSummary", async () => {
    const { kumaMonitorsToHealthSummary } = await import("@/lib/kuma/adapter");

    const monitors = [
      createMockMonitor({ name: "API", status: 1, uptime720: 99.9 }),
      createMockMonitor({ name: "Database", status: 1, uptime720: 99.8 }),
    ];

    const result = kumaMonitorsToHealthSummary("Test Project", "test-project", monitors);

    expect(result.status).toBe("healthy");
    expect(result.components).toHaveLength(2);
    expect(result.uptime30d).toBe(99.85);
    expect(result.source).toBe("kuma");
  });

  it("should use worst status when monitors disagree", async () => {
    const { kumaMonitorsToHealthSummary } = await import("@/lib/kuma/adapter");

    const monitors = [
      createMockMonitor({ name: "API", status: 1 }),
      createMockMonitor({ name: "Database", status: 0 }),
    ];

    const result = kumaMonitorsToHealthSummary("Test Project", "test-project", monitors);

    expect(result.status).toBe("down");
  });

  it("should return unknown for empty monitor array", async () => {
    const { kumaMonitorsToHealthSummary } = await import("@/lib/kuma/adapter");

    const result = kumaMonitorsToHealthSummary("Test Project", "test-project", []);

    expect(result.status).toBe("unknown");
    expect(result.components).toHaveLength(0);
  });

  it("should average uptime across monitors", async () => {
    const { kumaMonitorsToHealthSummary } = await import("@/lib/kuma/adapter");

    const monitors = [
      createMockMonitor({ uptime720: 100 }),
      createMockMonitor({ uptime720: 98 }),
    ];

    const result = kumaMonitorsToHealthSummary("Test", "test", monitors);

    expect(result.uptime30d).toBe(99);
  });
});

describe("Kuma Status Mapping", () => {
  it("should map all Kuma status codes correctly", async () => {
    const { kumaStatusToHealth } = await import("@/lib/kuma/adapter");

    expect(kumaStatusToHealth(0)).toBe("down");
    expect(kumaStatusToHealth(1)).toBe("healthy");
    expect(kumaStatusToHealth(2)).toBe("unknown");
    expect(kumaStatusToHealth(3)).toBe("degraded");
  });
});

describe("Kuma Backward Compatibility", () => {
  it("should report not configured when KUMA_URL is not set", async () => {
    const originalEnv = process.env.KUMA_URL;
    delete process.env.KUMA_URL;

    const { isKumaConfigured } = await import("@/lib/kuma/adapter");
    expect(isKumaConfigured()).toBe(false);

    process.env.KUMA_URL = originalEnv;
  });
});

describe("Kuma Federation", () => {
  it("should export fetchFederatedStatus", async () => {
    const { fetchFederatedStatus } = await import("@/lib/kuma/federation");
    expect(typeof fetchFederatedStatus).toBe("function");
  });

  it("should return unavailable for unreachable Kuma instances", async () => {
    const { fetchFederatedStatus } = await import("@/lib/kuma/federation");

    const result = await fetchFederatedStatus("http://localhost:99999");

    expect(result.available).toBe(false);
    expect(result.overallStatus).toBe("unknown");
    expect(result.monitors).toHaveLength(0);
    expect(result.error).toBeDefined();
  });
});

describe("Kuma Component Health", () => {
  it("should export getKumaComponentHealth", async () => {
    const { getKumaComponentHealth } = await import("@/lib/kuma/component-health");
    expect(typeof getKumaComponentHealth).toBe("function");
  });

  it("should export shouldUseKumaComponentHealth", async () => {
    const { shouldUseKumaComponentHealth } = await import("@/lib/kuma/component-health");
    expect(typeof shouldUseKumaComponentHealth).toBe("function");
  });

  it("should return true for kuma and both monitoring sources", async () => {
    const originalEnv = process.env.KUMA_URL;
    process.env.KUMA_URL = "http://localhost:3002";

    // Re-import to pick up env change
    const mod = await import("@/lib/kuma/component-health");
    expect(mod.shouldUseKumaComponentHealth("kuma")).toBe(true);
    expect(mod.shouldUseKumaComponentHealth("both")).toBe(true);
    expect(mod.shouldUseKumaComponentHealth("internal")).toBe(false);

    process.env.KUMA_URL = originalEnv;
  });

  it("should merge component health with kuma taking precedence", async () => {
    const { mergeComponentHealth } = await import("@/lib/kuma/component-health");

    const internal = [
      { name: "api", status: "ok" as const, latencyMs: 10, avgLatencyMs: 10, checkCount: 5, failureCount: 0, lastCheckedAt: new Date(), message: null },
      { name: "database", status: "ok" as const, latencyMs: 5, avgLatencyMs: 5, checkCount: 5, failureCount: 0, lastCheckedAt: new Date(), message: null },
    ];
    const kuma = [
      { name: "API", status: "degraded" as const, latencyMs: 200, avgLatencyMs: 200, checkCount: 1, failureCount: 0, lastCheckedAt: new Date(), message: null },
    ];

    const merged = mergeComponentHealth(internal, kuma);

    // "api" should be overridden by Kuma's "API" (case-insensitive merge)
    expect(merged).toHaveLength(2);
    const apiComp = merged.find((c) => c.name === "API");
    expect(apiComp?.status).toBe("degraded");
  });
});

describe("Kuma Push Reporter", () => {
  it("should export reportHealthToKuma", async () => {
    const { reportHealthToKuma } = await import("@/lib/kuma/push-reporter");
    expect(typeof reportHealthToKuma).toBe("function");
  });

  it("should fail gracefully when Kuma is not configured", async () => {
    const originalEnv = process.env.KUMA_URL;
    delete process.env.KUMA_URL;

    const { reportHealthToKuma } = await import("@/lib/kuma/push-reporter");
    const result = await reportHealthToKuma("test-token");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Kuma is not configured");

    process.env.KUMA_URL = originalEnv;
  });
});

/* ================================================================
   Test Helpers
   ================================================================ */

function createMockMonitor(overrides: Partial<{
  id: number;
  name: string;
  status: 0 | 1 | 2 | 3;
  type: string;
  url: string;
  interval: number;
  active: boolean;
  uptime720: number | undefined;
  uptime24: number | undefined;
  avgPing: number | undefined;
}> = {}) {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? "Test Monitor",
    type: (overrides.type ?? "http") as "http",
    url: overrides.url ?? "http://localhost:3000",
    interval: overrides.interval ?? 60,
    active: overrides.active ?? true,
    status: (overrides.status ?? 1) as 0 | 1 | 2 | 3,
    maxretries: 0,
    accepted_statuscodes: ["200-299"],
    description: "",
    uptime24: overrides.uptime24,
    uptime720: overrides.uptime720,
    avgPing: overrides.avgPing,
    tags: [],
    parent: null,
    notificationIDList: {},
    method: "GET",
    body: null,
    headers: null,
    port: null,
    hostname: null,
    keyword: null,
  };
}

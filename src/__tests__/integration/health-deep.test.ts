/**
 * Integration test: Deep health check aggregation and Kuma adapter.
 *
 * Tests: deep health check structure, Kuma adapter transformation
 * correctness, status badge SVG rendering, and edge cases.
 */

import { describe, it, expect } from "vitest";

describe("Health Adapter Edge Cases", () => {
  it("should handle monitor with all fields undefined", async () => {
    const { kumaToHealthSummary } = await import("@/lib/kuma/adapter");

    const monitor = {
      id: 1,
      name: "Minimal Monitor",
      type: "http" as const,
      url: "",
      interval: 60,
      active: true,
      status: 1 as const,
      maxretries: 0,
      accepted_statuscodes: ["200-299"],
      description: "",
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

    const result = kumaToHealthSummary(monitor);

    expect(result.projectName).toBe("Minimal Monitor");
    expect(result.status).toBe("healthy");
    expect(result.uptime30d).toBeNull();
    expect(result.latencyMs).toBeNull();
    expect(result.components).toHaveLength(0);
    expect(result.source).toBe("kuma");
  });

  it("should slugify monitor names correctly", async () => {
    const { kumaToHealthSummary } = await import("@/lib/kuma/adapter");

    const testCases = [
      { name: "Simple Name", expectedSlug: "simple-name" },
      { name: "Name With  Multiple   Spaces", expectedSlug: "name-with-multiple-spaces" },
      { name: "Special!@#Characters$%^", expectedSlug: "special-characters" },
      { name: "---Leading-And-Trailing---", expectedSlug: "leading-and-trailing" },
      { name: "UPPERCASE", expectedSlug: "uppercase" },
      { name: "mixed-Case_Name", expectedSlug: "mixed-case-name" },
    ];

    for (const { name, expectedSlug } of testCases) {
      const monitor = {
        id: 1, name, type: "http" as const, url: "", interval: 60,
        active: true, status: 1 as const, maxretries: 0,
        accepted_statuscodes: ["200-299"], description: "", tags: [],
        parent: null, notificationIDList: {}, method: "GET",
        body: null, headers: null, port: null, hostname: null, keyword: null,
      };
      const result = kumaToHealthSummary(monitor);
      expect(result.slug).toBe(expectedSlug);
    }
  });
});

describe("Health Summary Aggregation", () => {
  it("should compute correct average latency from multiple monitors", async () => {
    const { kumaMonitorsToHealthSummary } = await import("@/lib/kuma/adapter");

    const monitors = [
      createFullMonitor({ avgPing: 10 }),
      createFullMonitor({ avgPing: 20 }),
      createFullMonitor({ avgPing: 30 }),
    ];

    const result = kumaMonitorsToHealthSummary("Test", "test", monitors);

    expect(result.latencyMs).toBe(20); // average of 10, 20, 30
  });

  it("should ignore null pings in latency average", async () => {
    const { kumaMonitorsToHealthSummary } = await import("@/lib/kuma/adapter");

    const monitors = [
      createFullMonitor({ avgPing: 100 }),
      createFullMonitor({ avgPing: undefined }),
    ];

    const result = kumaMonitorsToHealthSummary("Test", "test", monitors);

    expect(result.latencyMs).toBe(100); // only one valid ping
  });

  it("should handle all monitors with null uptime", async () => {
    const { kumaMonitorsToHealthSummary } = await import("@/lib/kuma/adapter");

    const monitors = [
      createFullMonitor({ uptime720: undefined }),
      createFullMonitor({ uptime720: undefined }),
    ];

    const result = kumaMonitorsToHealthSummary("Test", "test", monitors);

    expect(result.uptime30d).toBeNull();
  });

  it("should handle single monitor group", async () => {
    const { kumaMonitorsToHealthSummary } = await import("@/lib/kuma/adapter");

    const monitors = [createFullMonitor({ status: 1, uptime720: 99.5, avgPing: 42 })];

    const result = kumaMonitorsToHealthSummary("Solo Project", "solo-project", monitors);

    expect(result.status).toBe("healthy");
    expect(result.components).toHaveLength(1);
    expect(result.uptime30d).toBe(99.5);
    expect(result.latencyMs).toBe(42);
  });
});

describe("Status Priority Resolution", () => {
  it("should pick down over degraded", async () => {
    const { kumaMonitorsToHealthSummary } = await import("@/lib/kuma/adapter");

    const monitors = [
      createFullMonitor({ status: 3 }), // maintenance -> degraded
      createFullMonitor({ status: 0 }), // down
      createFullMonitor({ status: 1 }), // up -> healthy
    ];

    const result = kumaMonitorsToHealthSummary("Test", "test", monitors);

    expect(result.status).toBe("down");
  });

  it("should pick degraded over unknown", async () => {
    const { kumaMonitorsToHealthSummary } = await import("@/lib/kuma/adapter");

    const monitors = [
      createFullMonitor({ status: 3 }), // maintenance -> degraded
      createFullMonitor({ status: 2 }), // pending -> unknown
    ];

    const result = kumaMonitorsToHealthSummary("Test", "test", monitors);

    expect(result.status).toBe("degraded");
  });

  it("should pick unknown over healthy", async () => {
    const { kumaMonitorsToHealthSummary } = await import("@/lib/kuma/adapter");

    const monitors = [
      createFullMonitor({ status: 2 }), // pending -> unknown
      createFullMonitor({ status: 1 }), // up -> healthy
    ];

    const result = kumaMonitorsToHealthSummary("Test", "test", monitors);

    expect(result.status).toBe("unknown");
  });

  it("should return healthy when all monitors are up", async () => {
    const { kumaMonitorsToHealthSummary } = await import("@/lib/kuma/adapter");

    const monitors = [
      createFullMonitor({ status: 1 }),
      createFullMonitor({ status: 1 }),
      createFullMonitor({ status: 1 }),
    ];

    const result = kumaMonitorsToHealthSummary("Test", "test", monitors);

    expect(result.status).toBe("healthy");
  });
});

describe("Federated Health Data", () => {
  it("should handle unreachable federation target gracefully", async () => {
    const { fetchFederatedStatus } = await import("@/lib/kuma/federation");

    const result = await fetchFederatedStatus("http://127.0.0.1:19999");

    expect(result.available).toBe(false);
    expect(result.kumaUrl).toBe("http://127.0.0.1:19999");
    expect(result.monitors).toHaveLength(0);
    expect(result.fetchedAt).toBeDefined();
  });

  it("should include error message for failed federation", async () => {
    const { fetchFederatedStatus } = await import("@/lib/kuma/federation");

    const result = await fetchFederatedStatus("http://127.0.0.1:19999");

    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe("string");
  });
});

describe("Kuma Uptime Delegation", () => {
  it("should export getKumaUptime", async () => {
    const { getKumaUptime } = await import("@/lib/kuma/uptime");
    expect(typeof getKumaUptime).toBe("function");
  });

  it("should return null when Kuma is not configured", async () => {
    const originalEnv = process.env.KUMA_URL;
    delete process.env.KUMA_URL;

    const { getKumaUptime } = await import("@/lib/kuma/uptime");
    const result = await getKumaUptime(1, 24);

    expect(result).toBeNull();

    process.env.KUMA_URL = originalEnv;
  });
});

/* ================================================================
   Test Helpers
   ================================================================ */

function createFullMonitor(overrides: Partial<{
  id: number;
  name: string;
  status: 0 | 1 | 2 | 3;
  uptime720: number | undefined;
  avgPing: number | undefined;
}> = {}) {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? "Test Monitor",
    type: "http" as const,
    url: "http://localhost",
    interval: 60,
    active: true,
    status: (overrides.status ?? 1) as 0 | 1 | 2 | 3,
    maxretries: 0,
    accepted_statuscodes: ["200-299"],
    description: "",
    uptime24: undefined,
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

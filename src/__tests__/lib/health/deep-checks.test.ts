/**
 * Unit tests for deep health check registry, individual checks, and ?check= filter.
 *
 * All external dependencies (fetch, db, crypto) are mocked.
 * Tests verify: registry structure, each check's 3 scenarios
 * (not configured, ok, error), and the single-check filter.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database connection
vi.mock("@/db/connection", () => ({
  db: {
    execute: vi.fn(),
    query: {},
  },
}));

// Mock the crypto module
vi.mock("@/lib/crypto/aes", () => ({
  encrypt: vi.fn((v: string) => `encrypted:${v}`),
  decrypt: vi.fn((v: string) => v.replace("encrypted:", "")),
}));

// Mock the AI config
vi.mock("@/lib/ai/config", () => ({
  getAiConfig: vi.fn(() => ({
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250514",
    maxTokens: 2048,
    temperature: 0.3,
  })),
}));

describe("Check Registry", () => {
  it("should export all 13 check slugs", async () => {
    const { getCheckSlugs } = await import("@/lib/health/checks");
    const slugs = getCheckSlugs();

    expect(slugs).toContain("postgres");
    expect(slugs).toContain("timescaledb");
    expect(slugs).toContain("encryption");
    expect(slugs).toContain("inngest");
    expect(slugs).toContain("dokploy");
    expect(slugs).toContain("hetzner");
    expect(slugs).toContain("kuma");
    expect(slugs).toContain("github-oauth");
    expect(slugs).toContain("github-api");
    expect(slugs).toContain("resend");
    expect(slugs).toContain("slack");
    expect(slugs).toContain("ai");
    expect(slugs).toContain("sse");
    expect(slugs.length).toBe(13);
  });

  it("should have all registry entries as functions", async () => {
    const { CHECK_REGISTRY } = await import("@/lib/health/checks");
    for (const [slug, fn] of CHECK_REGISTRY) {
      expect(typeof fn).toBe("function");
      expect(typeof slug).toBe("string");
    }
  });
});

describe("DeepCheckResult structure", () => {
  it("every check should return slug, name, status, critical, latencyMs", async () => {
    const { CHECK_REGISTRY } = await import("@/lib/health/checks");

    // Mock fetch globally for checks that make HTTP calls
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    // Mock db.execute for postgres/timescaledb
    const { db } = await import("@/db/connection");
    (db.execute as ReturnType<typeof vi.fn>).mockResolvedValue([
      { extversion: "2.14.0" },
    ]);

    for (const [slug, fn] of CHECK_REGISTRY) {
      const result = await fn();
      expect(result).toHaveProperty("slug");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("critical");
      expect(result).toHaveProperty("latencyMs");
      expect(result.slug).toBe(slug);
      expect(["ok", "error"]).toContain(result.status);
      expect(typeof result.critical).toBe("boolean");
      expect(typeof result.latencyMs).toBe("number");
    }

    fetchSpy.mockRestore();
  });
});

describe("checkPostgres", () => {
  it("should return ok when SELECT 1 succeeds", async () => {
    const { db } = await import("@/db/connection");
    (db.execute as ReturnType<typeof vi.fn>).mockResolvedValue([
      { "?column?": 1 },
    ]);

    const { checkPostgres } = await import("@/lib/health/checks/postgres");
    const result = await checkPostgres();

    expect(result.slug).toBe("postgres");
    expect(result.status).toBe("ok");
    expect(result.critical).toBe(true);
  });

  it("should return error when DB is unreachable", async () => {
    const { db } = await import("@/db/connection");
    (db.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Connection refused")
    );

    const { checkPostgres } = await import("@/lib/health/checks/postgres");
    const result = await checkPostgres();

    expect(result.status).toBe("error");
    expect(result.error).toContain("Connection refused");
    expect(result.critical).toBe(true);
  });
});

describe("checkTimescaleDB", () => {
  it("should return ok when extension is installed", async () => {
    const { db } = await import("@/db/connection");
    (db.execute as ReturnType<typeof vi.fn>).mockResolvedValue([
      { extversion: "2.14.0" },
    ]);

    const { checkTimescaleDB } =
      await import("@/lib/health/checks/timescaledb");
    const result = await checkTimescaleDB();

    expect(result.slug).toBe("timescaledb");
    expect(result.status).toBe("ok");
    expect(result.critical).toBe(false);
  });

  it("should return error when extension not installed", async () => {
    const { db } = await import("@/db/connection");
    (db.execute as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const { checkTimescaleDB } =
      await import("@/lib/health/checks/timescaledb");
    const result = await checkTimescaleDB();

    expect(result.status).toBe("error");
    expect(result.error).toContain("not installed");
  });
});

describe("checkInngest", () => {
  it("should return error when no keys configured", async () => {
    const original = { ...process.env };
    delete process.env.INNGEST_EVENT_KEY;
    delete process.env.INNGEST_SIGNING_KEY;

    const { checkInngest } = await import("@/lib/health/checks/inngest");
    const result = await checkInngest();

    expect(result.slug).toBe("inngest");
    expect(result.status).toBe("error");
    expect(result.error).toContain("not configured");

    process.env = original;
  });

  it("should return ok when both keys set", async () => {
    process.env.INNGEST_EVENT_KEY = "test-key";
    process.env.INNGEST_SIGNING_KEY = "test-signing-key";

    const { checkInngest } = await import("@/lib/health/checks/inngest");
    const result = await checkInngest();

    expect(result.status).toBe("ok");

    delete process.env.INNGEST_EVENT_KEY;
    delete process.env.INNGEST_SIGNING_KEY;
  });
});

describe("checkKuma", () => {
  it("should return ok with note when not configured", async () => {
    const original = process.env.KUMA_URL;
    delete process.env.KUMA_URL;

    const { checkKuma } = await import("@/lib/health/checks/kuma");
    const result = await checkKuma();

    expect(result.slug).toBe("kuma");
    expect(result.status).toBe("ok");
    expect(result.error).toContain("Not configured");

    process.env.KUMA_URL = original;
  });

  it("should return ok when Kuma is reachable", async () => {
    process.env.KUMA_URL = "http://localhost:3002";
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("<html>Kuma</html>", { status: 200 }));

    const { checkKuma } = await import("@/lib/health/checks/kuma");
    const result = await checkKuma();

    expect(result.status).toBe("ok");

    spy.mockRestore();
    delete process.env.KUMA_URL;
  });

  it("should return error when Kuma is unreachable", async () => {
    process.env.KUMA_URL = "http://localhost:9999";
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("ECONNREFUSED"));

    const { checkKuma } = await import("@/lib/health/checks/kuma");
    const result = await checkKuma();

    expect(result.status).toBe("error");
    expect(result.error).toContain("ECONNREFUSED");

    spy.mockRestore();
    delete process.env.KUMA_URL;
  });
});

describe("checkGitHubOAuth", () => {
  it("should return ok with note when not configured", async () => {
    delete process.env.AUTH_GITHUB_ID;
    delete process.env.AUTH_GITHUB_SECRET;

    const { checkGitHubOAuth } =
      await import("@/lib/health/checks/github-oauth");
    const result = await checkGitHubOAuth();

    expect(result.slug).toBe("github-oauth");
    expect(result.status).toBe("ok");
    expect(result.error).toContain("Not configured");
  });

  it("should return ok when both vars set with valid format", async () => {
    process.env.AUTH_GITHUB_ID = "Iv1.abcdef1234567890";
    process.env.AUTH_GITHUB_SECRET = "abcdef1234567890abcdef1234567890abcdef12";

    const { checkGitHubOAuth } =
      await import("@/lib/health/checks/github-oauth");
    const result = await checkGitHubOAuth();

    expect(result.status).toBe("ok");

    delete process.env.AUTH_GITHUB_ID;
    delete process.env.AUTH_GITHUB_SECRET;
  });

  it("should return error when ID is too short", async () => {
    process.env.AUTH_GITHUB_ID = "short";
    process.env.AUTH_GITHUB_SECRET = "some-secret-value";

    const { checkGitHubOAuth } =
      await import("@/lib/health/checks/github-oauth");
    const result = await checkGitHubOAuth();

    expect(result.status).toBe("error");
    expect(result.error).toContain("malformed");

    delete process.env.AUTH_GITHUB_ID;
    delete process.env.AUTH_GITHUB_SECRET;
  });
});

describe("checkGitHubApi", () => {
  it("should return ok when API is reachable", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ rate: { remaining: 60 } }), {
          status: 200,
        })
      );

    const { checkGitHubApi } = await import("@/lib/health/checks/github-api");
    const result = await checkGitHubApi();

    expect(result.slug).toBe("github-api");
    expect(result.status).toBe("ok");

    spy.mockRestore();
  });

  it("should return error when rate limited", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("rate limited", { status: 403 }));

    const { checkGitHubApi } = await import("@/lib/health/checks/github-api");
    const result = await checkGitHubApi();

    expect(result.status).toBe("error");
    expect(result.error).toContain("Rate limited");

    spy.mockRestore();
  });
});

describe("checkResend", () => {
  it("should return ok with note when not configured", async () => {
    delete process.env.RESEND_API_KEY;

    const { checkResend } = await import("@/lib/health/checks/resend");
    const result = await checkResend();

    expect(result.slug).toBe("resend");
    expect(result.status).toBe("ok");
    expect(result.error).toContain("Not configured");
  });

  it("should return error when API key is invalid", async () => {
    process.env.RESEND_API_KEY = "invalid-key";
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    const { checkResend } = await import("@/lib/health/checks/resend");
    const result = await checkResend();

    expect(result.status).toBe("error");
    expect(result.error).toContain("invalid");

    spy.mockRestore();
    delete process.env.RESEND_API_KEY;
  });
});

describe("checkSlack", () => {
  it("should return ok with note when not configured", async () => {
    delete process.env.SLACK_WEBHOOK_URL;

    const { checkSlack } = await import("@/lib/health/checks/slack");
    const result = await checkSlack();

    expect(result.slug).toBe("slack");
    expect(result.status).toBe("ok");
    expect(result.error).toContain("Not configured");
  });

  it("should return ok when Slack returns 400 no_text", async () => {
    process.env.SLACK_WEBHOOK_URL =
      "https://hooks.slack.com/services/T00/B00/xxx";
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("no_text", { status: 400 }));

    const { checkSlack } = await import("@/lib/health/checks/slack");
    const result = await checkSlack();

    expect(result.status).toBe("ok");

    spy.mockRestore();
    delete process.env.SLACK_WEBHOOK_URL;
  });

  it("should return error for invalid webhook URL format", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://not-slack.com/webhook";

    const { checkSlack } = await import("@/lib/health/checks/slack");
    const result = await checkSlack();

    expect(result.status).toBe("error");
    expect(result.error).toContain("does not look like");

    delete process.env.SLACK_WEBHOOK_URL;
  });
});

describe("checkAiProvider", () => {
  it("should return ok with note when no API key set", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const { checkAiProvider } = await import("@/lib/health/checks/ai-provider");
    const result = await checkAiProvider();

    expect(result.slug).toBe("ai");
    expect(result.status).toBe("ok");
    expect(result.error).toContain("Not configured");
  });

  it("should return ok when provider responds", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );

    const { checkAiProvider } = await import("@/lib/health/checks/ai-provider");
    const result = await checkAiProvider();

    expect(result.status).toBe("ok");

    spy.mockRestore();
    delete process.env.ANTHROPIC_API_KEY;
  });
});

describe("checkSseBroadcast", () => {
  it("should return ok with note when not configured", async () => {
    delete process.env.SSE_BROADCAST_SECRET;

    const { checkSseBroadcast } =
      await import("@/lib/health/checks/sse-broadcast");
    const result = await checkSseBroadcast();

    expect(result.slug).toBe("sse");
    expect(result.status).toBe("ok");
    expect(result.error).toContain("not configured");
  });
});

describe("checkEncryption", () => {
  it("should return ok when round-trip succeeds", async () => {
    process.env.CONFIG_ENCRYPTION_KEY = "a".repeat(64);

    const { checkEncryption } = await import("@/lib/health/checks/encryption");
    const result = await checkEncryption();

    expect(result.slug).toBe("encryption");
    expect(result.status).toBe("ok");
    expect(result.critical).toBe(true);

    delete process.env.CONFIG_ENCRYPTION_KEY;
  });
});

describe("checkDeepHealth orchestrator", () => {
  beforeEach(async () => {
    const { _resetCache } = await import("@/lib/health/deep");
    _resetCache();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 })
    );
  });

  it("should return ok when no critical checks fail", async () => {
    const { db } = await import("@/db/connection");
    (db.execute as ReturnType<typeof vi.fn>).mockResolvedValue([
      { extversion: "2.14" },
    ]);
    process.env.CONFIG_ENCRYPTION_KEY = "a".repeat(64);

    const { checkDeepHealth } = await import("@/lib/health/deep");
    const result = await checkDeepHealth();

    expect(result.status).toBe("ok");
    expect(result.checks.length).toBe(13);
    expect(result.checkedAt).toBeDefined();
    expect(result.cached).toBe(false);

    delete process.env.CONFIG_ENCRYPTION_KEY;
  });

  it("should return degraded when a critical check fails", async () => {
    const { db } = await import("@/db/connection");
    (db.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB down")
    );

    const { checkDeepHealth } = await import("@/lib/health/deep");
    const result = await checkDeepHealth();

    expect(result.status).toBe("degraded");
    const pgCheck = result.checks.find((c) => c.slug === "postgres");
    expect(pgCheck?.status).toBe("error");
  });
});

describe("checkSingle", () => {
  it("should return single check result for valid slug", async () => {
    const { db } = await import("@/db/connection");
    (db.execute as ReturnType<typeof vi.fn>).mockResolvedValue([
      { "?column?": 1 },
    ]);

    const { checkSingle } = await import("@/lib/health/deep");
    const result = await checkSingle("postgres");

    expect(result).not.toBeNull();
    expect(result?.slug).toBe("postgres");
    expect(result?.status).toBe("ok");
  });

  it("should return null for unknown slug", async () => {
    const { checkSingle } = await import("@/lib/health/deep");
    const result = await checkSingle("nonexistent");

    expect(result).toBeNull();
  });
});

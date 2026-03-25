import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  reportHealthToKuma,
  reportSelfHealthToKuma,
} from "@/lib/kuma/push-reporter";

describe("reportHealthToKuma", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.KUMA_URL = "https://kuma.example.com";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("returns early when KUMA_URL is not set", async () => {
    delete process.env.KUMA_URL;
    const result = await reportHealthToKuma("test-token");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Kuma is not configured");
    expect(result.durationMs).toBe(0);
  });

  it("constructs the correct push URL with status, msg, and ping", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    await reportHealthToKuma("abc123", "up", "All healthy", 42);

    expect(mockFetch).toHaveBeenCalledOnce();
    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.pathname).toBe("/api/push/abc123");
    expect(calledUrl.searchParams.get("status")).toBe("up");
    expect(calledUrl.searchParams.get("msg")).toBe("All healthy");
    expect(calledUrl.searchParams.get("ping")).toBe("42");
  });

  it("returns success when Kuma responds with 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK" })
    );

    const result = await reportHealthToKuma("token");
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.error).toBeUndefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("returns failure when Kuma responds with non-200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      })
    );

    const result = await reportHealthToKuma("bad-token");
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(404);
    expect(result.error).toBe("HTTP 404 Not Found");
  });

  it("handles network errors gracefully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED"))
    );

    const result = await reportHealthToKuma("token");
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(0);
    expect(result.error).toBe("ECONNREFUSED");
  });

  it("reports timeout errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(
          new DOMException("The operation was aborted", "AbortError")
        )
    );

    const result = await reportHealthToKuma("token");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Timeout (5s)");
  });

  it("defaults status to 'up' when not specified", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    await reportHealthToKuma("token");

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.searchParams.get("status")).toBe("up");
  });

  it("omits msg and ping params when not provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    await reportHealthToKuma("token", "down");

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.searchParams.has("msg")).toBe(false);
    expect(calledUrl.searchParams.has("ping")).toBe(false);
  });
});

describe("reportSelfHealthToKuma", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.KUMA_URL = "https://kuma.example.com";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("sends 'up' when all components are healthy", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    const result = await reportSelfHealthToKuma("token", {
      postgres: true,
      redis: true,
      kuma: true,
    });

    expect(result.success).toBe(true);
    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.searchParams.get("status")).toBe("up");
    expect(calledUrl.searchParams.get("msg")).toBe("3/3 components healthy");
  });

  it("sends 'down' when any component is unhealthy", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    await reportSelfHealthToKuma("token", {
      postgres: true,
      redis: false,
      kuma: true,
    });

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.searchParams.get("status")).toBe("down");
    expect(calledUrl.searchParams.get("msg")).toBe("2/3 components healthy");
  });

  it("handles empty component map as 'up'", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    await reportSelfHealthToKuma("token", {});

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.searchParams.get("status")).toBe("up");
    expect(calledUrl.searchParams.get("msg")).toBe("0/0 components healthy");
  });
});

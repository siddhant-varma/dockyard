import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";

type MiddlewareFn = (req: NextRequest) => Response;
let middleware: MiddlewareFn;

beforeAll(async () => {
  process.env.DOCKYARD_AUTH_ENABLED = "true";
  ({ middleware } = (await import("@/middleware")) as {
    middleware: MiddlewareFn;
  });
});

const call = (path: string, method = "GET", cookie?: string) =>
  middleware(
    new NextRequest(`http://localhost${path}`, {
      method,
      headers: cookie ? { cookie } : {},
    })
  );

describe("middleware API auth gate", () => {
  it("rejects protected API routes without a session cookie", () => {
    expect(call("/api/settings").status).toBe(401);
    expect(call("/api/sse").status).toBe(401);
    expect(call("/api/projects", "POST").status).toBe(401);
  });

  it("lets self-authenticating and public API routes through", () => {
    for (const path of [
      "/api/auth/session",
      "/api/health",
      "/api/health/deep",
      "/api/ingest/kuma",
      "/api/inngest",
    ]) {
      expect(call(path).status, path).not.toBe(401);
    }
    expect(call("/api/projects").status).not.toBe(401);
  });

  it("lets API calls with a session cookie through", () => {
    expect(
      call("/api/settings", "GET", "authjs.session-token=x").status
    ).not.toBe(401);
  });

  it("redirects pages without a session to /login", () => {
    const res = call("/watchtower");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });
});

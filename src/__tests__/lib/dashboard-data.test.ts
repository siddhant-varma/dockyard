import { describe, it, expect, vi, afterEach } from "vitest";

let cookieHeader = "";
vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => cookieHeader }),
}));

afterEach(() => vi.restoreAllMocks());

describe("dashboard-data internal fetches", () => {
  it("forwards the session cookie and skips the shared cache", async () => {
    cookieHeader = "authjs.session-token=abc";
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const { fetchServerStatus } = await import("@/lib/dashboard-data");
    await fetchServerStatus();
    const init = spy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).cookie).toBe(
      "authjs.session-token=abc"
    );
    expect(init.cache).toBe("no-store");
  });

  it("uses the revalidating cache for anonymous visitors", async () => {
    cookieHeader = "";
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const { fetchServerStatus } = await import("@/lib/dashboard-data");
    await fetchServerStatus();
    const init = spy.mock.calls[0][1] as RequestInit & {
      next?: { revalidate: number };
    };
    expect(init.headers).toBeUndefined();
    expect(init.next?.revalidate).toBe(60);
  });
});

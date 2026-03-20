/**
 * Integration test: Config auto-rollback flow.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/connection", () => ({
  db: {
    query: {
      configEntries: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
      configAuditLog: { findMany: vi.fn().mockResolvedValue([]) },
      projects: { findFirst: vi.fn().mockResolvedValue({ id: "p1" }) },
    },
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/crypto/aes", () => ({
  encrypt: (v: string) => v,
  decrypt: (v: string) => v,
}));

describe("Config Auto-Rollback Flow", () => {
  it("should export getRollbackConfig", async () => {
    const { getRollbackConfig } = await import("@/lib/config/rollback");
    expect(typeof getRollbackConfig).toBe("function");
  });

  it("should export executeAutoRollback", async () => {
    const { executeAutoRollback } = await import("@/lib/config/rollback");
    expect(typeof executeAutoRollback).toBe("function");
  });
});

/**
 * Integration test: Config auto-rollback flow.
 *
 * Tests: getRollbackConfig returns defaults, executeAutoRollback restores
 * entries from audit log, no-op when nothing to revert, rollback count.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Controllable DB mocks ---
const mockProjectFindFirst = vi.fn();
const mockAuditSelect = vi.fn();
const mockConfigFindFirst = vi.fn();
const mockUpdateSetWhere = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn();

vi.mock("@/db/connection", () => {
  const projectFindFirstRef = (...args: unknown[]) => mockProjectFindFirst(...args);
  const configFindFirstRef = (...args: unknown[]) => mockConfigFindFirst(...args);
  const auditSelectRef = (...args: unknown[]) => mockAuditSelect(...args);
  const updateSetWhereRef = (...args: unknown[]) => mockUpdateSetWhere(...args);
  const insertValuesRef = (...args: unknown[]) => {
    mockInsertValues(...args);
    return { returning: (...rArgs: unknown[]) => mockInsertReturning(...rArgs) };
  };

  return {
    db: {
      query: {
        configEntries: {
          findMany: vi.fn().mockResolvedValue([]),
          findFirst: configFindFirstRef,
        },
        configAuditLog: { findMany: vi.fn().mockResolvedValue([]) },
        projects: {
          findFirst: projectFindFirstRef,
        },
      },
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: auditSelectRef,
            }),
          }),
        }),
      }),
      insert: () => ({
        values: insertValuesRef,
      }),
      update: () => ({
        set: () => ({
          where: updateSetWhereRef,
        }),
      }),
      delete: () => ({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    },
  };
});

vi.mock("@/lib/crypto/aes", () => ({
  encrypt: (v: string) => `enc:${v}`,
  decrypt: (v: string) => (typeof v === "string" && v.startsWith("enc:") ? v.slice(4) : v),
}));

describe("Config Auto-Rollback Flow", () => {
  beforeEach(() => {
    mockProjectFindFirst.mockReset();
    mockAuditSelect.mockReset();
    mockConfigFindFirst.mockReset();
    mockUpdateSetWhere.mockReset();
    mockInsertReturning.mockReset();
    mockInsertValues.mockReset();
  });

  // --- Original smoke tests ---

  it("should export getRollbackConfig", async () => {
    const { getRollbackConfig } = await import("@/lib/config/rollback");
    expect(typeof getRollbackConfig).toBe("function");
  });

  it("should export executeAutoRollback", async () => {
    const { executeAutoRollback } = await import("@/lib/config/rollback");
    expect(typeof executeAutoRollback).toBe("function");
  });

  // --- Behavior tests ---

  it("getRollbackConfig returns default config when project has no rollbackConfig", async () => {
    mockProjectFindFirst.mockResolvedValue({ id: "p1", name: "Test" });

    const { getRollbackConfig } = await import("@/lib/config/rollback");
    const config = await getRollbackConfig("p1");

    expect(config).toEqual({
      enabled: false,
      healthCheckTimeoutSecs: 60,
    });
  });

  it("getRollbackConfig returns stored config when project has rollbackConfig", async () => {
    mockProjectFindFirst.mockResolvedValue({
      id: "p1",
      name: "Test",
      rollbackConfig: { enabled: true, healthCheckTimeoutSecs: 120 },
    });

    const { getRollbackConfig } = await import("@/lib/config/rollback");
    const config = await getRollbackConfig("p1");

    expect(config).toEqual({
      enabled: true,
      healthCheckTimeoutSecs: 120,
    });
  });

  it("executeAutoRollback returns zero when no recent changes exist", async () => {
    mockAuditSelect.mockResolvedValue([]);

    const { executeAutoRollback } = await import("@/lib/config/rollback");
    const result = await executeAutoRollback("p1", "deploy-001");

    expect(result.rolledBack).toBe(0);
    expect(result.entries).toEqual([]);
  });

  it("executeAutoRollback reverts recent non-rollback changes", async () => {
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    mockAuditSelect.mockResolvedValue([
      {
        id: "audit-1",
        configEntryId: "cfg-001",
        projectId: "p1",
        changeReason: "User updated DB_HOST",
        changedAt: oneMinuteAgo,
      },
    ]);
    mockConfigFindFirst
      .mockResolvedValueOnce({
        id: "cfg-001",
        key: "DB_HOST",
        valueEncrypted: "enc:old-value",
      })
      // Second call is from upsertConfigEntry checking for existing entry
      .mockResolvedValueOnce({
        id: "cfg-001",
        projectId: "p1",
        key: "DB_HOST",
        valueEncrypted: "enc:old-value",
        isSecret: false,
        category: null,
        displayName: null,
        description: null,
        inputType: "text",
        inputOptions: null,
      });
    mockInsertReturning.mockResolvedValue([{ id: "cfg-001" }]);
    mockUpdateSetWhere.mockResolvedValue(undefined);

    const { executeAutoRollback } = await import("@/lib/config/rollback");
    const result = await executeAutoRollback("p1", "deploy-fail-001");

    expect(result.rolledBack).toBe(1);
    expect(result.entries).toContain("DB_HOST");
  });

  it("executeAutoRollback skips entries already marked as rollback", async () => {
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    mockAuditSelect.mockResolvedValue([
      {
        id: "audit-2",
        configEntryId: "cfg-002",
        projectId: "p1",
        changeReason: "Auto-rollback after failed deploy deploy-prev",
        changedAt: oneMinuteAgo,
      },
    ]);

    const { executeAutoRollback } = await import("@/lib/config/rollback");
    const result = await executeAutoRollback("p1", "deploy-fail-002");

    expect(result.rolledBack).toBe(0);
    expect(result.entries).toEqual([]);
  });

  it("executeAutoRollback skips entries older than 5 minutes", async () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000);
    mockAuditSelect.mockResolvedValue([
      {
        id: "audit-3",
        configEntryId: "cfg-003",
        projectId: "p1",
        changeReason: "User changed PORT",
        changedAt: tenMinutesAgo,
      },
    ]);

    const { executeAutoRollback } = await import("@/lib/config/rollback");
    const result = await executeAutoRollback("p1", "deploy-fail-003");

    expect(result.rolledBack).toBe(0);
    expect(result.entries).toEqual([]);
  });
});

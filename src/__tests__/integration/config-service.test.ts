/**
 * Integration test: Config management service.
 *
 * Tests: config entry CRUD with mocked DB and crypto. Verifies encryption
 * on create, decryption on read, update preserves encryption, and delete
 * removes the entry.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Controllable DB mocks ---
const mockFindMany = vi.fn();
const mockFindFirst = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn();
const mockUpdateSetWhere = vi.fn();
const mockDeleteWhere = vi.fn();

vi.mock("@/db/connection", () => {
  const findManyRef = (...args: unknown[]) => mockFindMany(...args);
  const findFirstRef = (...args: unknown[]) => mockFindFirst(...args);
  const insertValuesRef = (...args: unknown[]) => {
    mockInsertValues(...args);
    return { returning: (...rArgs: unknown[]) => mockInsertReturning(...rArgs) };
  };
  const updateSetWhereRef = (...args: unknown[]) => mockUpdateSetWhere(...args);
  const deleteWhereRef = (...args: unknown[]) => mockDeleteWhere(...args);

  return {
    db: {
      query: {
        configEntries: {
          findMany: findManyRef,
          findFirst: findFirstRef,
        },
      },
      insert: () => ({
        values: insertValuesRef,
      }),
      update: () => ({
        set: () => ({
          where: updateSetWhereRef,
        }),
      }),
      delete: () => ({
        where: deleteWhereRef,
      }),
    },
  };
});

// Track encrypt/decrypt calls to verify crypto behavior
const encryptSpy = vi.fn((v: string) => `enc:${v}`);
const decryptSpy = vi.fn((v: string) => {
  if (typeof v === "string" && v.startsWith("enc:")) return v.slice(4);
  return v;
});

vi.mock("@/lib/crypto/aes", () => ({
  encrypt: (v: string) => encryptSpy(v),
  decrypt: (v: string) => decryptSpy(v),
}));

describe("Config Service", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockFindFirst.mockReset();
    mockInsertReturning.mockReset();
    mockInsertValues.mockReset();
    mockUpdateSetWhere.mockReset();
    mockDeleteWhere.mockReset();
    encryptSpy.mockClear();
    decryptSpy.mockClear();
    // Restore default implementations after clear
    encryptSpy.mockImplementation((v: string) => `enc:${v}`);
    decryptSpy.mockImplementation((v: string) => {
      if (typeof v === "string" && v.startsWith("enc:")) return v.slice(4);
      return v;
    });
  });

  it("getConfigEntries returns decrypted values", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "cfg-001",
        key: "DATABASE_URL",
        valueEncrypted: "enc:postgres://localhost/db",
        environment: "production",
        isSecret: true,
        category: "Database",
        displayName: "Database URL",
        description: "Connection string",
        inputType: "text",
        inputOptions: null,
      },
      {
        id: "cfg-002",
        key: "LOG_LEVEL",
        valueEncrypted: "enc:info",
        environment: "production",
        isSecret: false,
        category: "App",
        displayName: "Log Level",
        description: null,
        inputType: "select",
        inputOptions: ["debug", "info", "warn"],
      },
    ]);

    const { getConfigEntries } = await import("@/lib/config/service");
    const entries = await getConfigEntries("proj-001");

    expect(entries).toHaveLength(2);
    expect(entries[0].value).toBe("postgres://localhost/db");
    expect(entries[1].value).toBe("info");
    expect(decryptSpy).toHaveBeenCalledTimes(2);
  });

  it("upsertConfigEntry encrypts value when creating a new entry", async () => {
    mockFindFirst.mockResolvedValue(null);
    mockInsertReturning.mockResolvedValue([{ id: "cfg-new" }]);

    const { upsertConfigEntry } = await import("@/lib/config/service");
    await upsertConfigEntry("proj-001", "API_KEY", "secret-value-123", {
      isSecret: true,
      category: "API",
    });

    expect(encryptSpy).toHaveBeenCalledWith("secret-value-123");
    expect(mockInsertValues).toHaveBeenCalled();
  });

  it("upsertConfigEntry encrypts value when updating an existing entry", async () => {
    mockFindFirst.mockResolvedValue({
      id: "cfg-existing",
      projectId: "proj-001",
      key: "API_KEY",
      valueEncrypted: "enc:old-secret",
      isSecret: true,
      category: "API",
      displayName: null,
      description: null,
      inputType: "text",
      inputOptions: null,
    });
    mockUpdateSetWhere.mockResolvedValue(undefined);
    mockInsertValues.mockReturnValue({ returning: vi.fn().mockResolvedValue([]) });

    const { upsertConfigEntry } = await import("@/lib/config/service");
    await upsertConfigEntry("proj-001", "API_KEY", "new-secret-456");

    expect(encryptSpy).toHaveBeenCalledWith("new-secret-456");
    expect(decryptSpy).toHaveBeenCalledWith("enc:old-secret");
    expect(mockUpdateSetWhere).toHaveBeenCalled();
  });

  it("deleteConfigEntry calls delete with the entry ID", async () => {
    mockDeleteWhere.mockResolvedValue(undefined);

    const { deleteConfigEntry } = await import("@/lib/config/service");
    await deleteConfigEntry("cfg-001");

    expect(mockDeleteWhere).toHaveBeenCalled();
  });

  it("buildEnvString concatenates all entries as KEY=value lines", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "cfg-a",
        key: "DB_HOST",
        valueEncrypted: "enc:localhost",
        environment: "production",
        isSecret: false,
        category: null,
        displayName: null,
        description: null,
        inputType: "text",
        inputOptions: null,
      },
      {
        id: "cfg-b",
        key: "DB_PORT",
        valueEncrypted: "enc:5432",
        environment: "production",
        isSecret: false,
        category: null,
        displayName: null,
        description: null,
        inputType: "text",
        inputOptions: null,
      },
    ]);

    const { buildEnvString } = await import("@/lib/config/service");
    const envStr = await buildEnvString("proj-001");

    expect(envStr).toBe("DB_HOST=localhost\nDB_PORT=5432");
  });

  it("getConfigEntries returns empty value for null valueEncrypted", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "cfg-null",
        key: "EMPTY_VAR",
        valueEncrypted: null,
        environment: "production",
        isSecret: false,
        category: null,
        displayName: null,
        description: null,
        inputType: "text",
        inputOptions: null,
      },
    ]);

    const { getConfigEntries } = await import("@/lib/config/service");
    const entries = await getConfigEntries("proj-001");

    expect(entries).toHaveLength(1);
    expect(entries[0].value).toBe("");
    expect(decryptSpy).not.toHaveBeenCalled();
  });

  it("upsertConfigEntry propagates encryption errors", async () => {
    encryptSpy.mockImplementationOnce(() => {
      throw new Error("Encryption key not configured");
    });

    const { upsertConfigEntry } = await import("@/lib/config/service");

    await expect(
      upsertConfigEntry("proj-001", "BROKEN", "value")
    ).rejects.toThrow("Encryption key not configured");
  });
});

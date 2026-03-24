/**
 * Integration test: Discovery scanner orchestrator.
 *
 * Tests: scanAll runs all enabled sources, disabled sources are skipped,
 * source errors are captured, projects are merged by slug, and
 * upsert behavior for new/existing projects.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DiscoveredProject, DiscoverySource } from "@/lib/discovery/types";

// Override the logger mock from test/setup.ts with one that survives restoreAllMocks.
// getLogger().child() must return a logger object; using plain functions avoids vi.fn() reset.
vi.mock("@/lib/logger", () => {
  const noop = () => {};
  const makeLogger = (): Record<string, unknown> => {
    const logger: Record<string, unknown> = {
      info: noop, error: noop, warn: noop, debug: noop, fatal: noop, trace: noop,
      child: () => logger,
    };
    return logger;
  };
  const logger = makeLogger();
  return {
    rootLogger: logger,
    getLogger: () => logger,
    createModuleLogger: () => logger,
  };
});

// --- Controllable DB mocks ---
const mockSourcesFindMany = vi.fn();
const mockProjectsFindFirst = vi.fn();
const mockCountSelect = vi.fn();
const mockInsertValues = vi.fn();
const mockUpdateSetWhere = vi.fn();

vi.mock("@/db/connection", () => {
  const sourcesFindManyRef = (...args: unknown[]) => mockSourcesFindMany(...args);
  const projectsFindFirstRef = (...args: unknown[]) => mockProjectsFindFirst(...args);
  const countSelectRef = (...args: unknown[]) => mockCountSelect(...args);
  const insertValuesRef = (...args: unknown[]) => {
    mockInsertValues(...args);
    return { returning: vi.fn().mockResolvedValue([{ id: "mock-project-id" }]) };
  };
  const updateSetWhereRef = (...args: unknown[]) => mockUpdateSetWhere(...args);

  return {
    db: {
      query: {
        discoverySources: {
          findMany: sourcesFindManyRef,
          findFirst: vi.fn(),
        },
        projects: {
          findFirst: projectsFindFirstRef,
        },
      },
      select: () => ({
        from: () => ({
          where: countSelectRef,
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
    },
  };
});

describe("Discovery Scanner", () => {
  beforeEach(() => {
    mockSourcesFindMany.mockReset();
    mockProjectsFindFirst.mockReset();
    mockCountSelect.mockReset();
    mockInsertValues.mockReset();
    mockUpdateSetWhere.mockReset();

    // Default: bootstrap says sources exist (skip auto-create)
    mockCountSelect.mockResolvedValue([{ count: 1 }]);
    // Default: no existing projects (all discovered = new)
    mockProjectsFindFirst.mockResolvedValue(null);
    mockUpdateSetWhere.mockResolvedValue(undefined);
  });

  /** Helper: create a mock DiscoverySource that returns the given projects. */
  function createMockSource(
    type: DiscoveredProject["source"],
    projects: DiscoveredProject[]
  ): DiscoverySource {
    return {
      type,
      scan: vi.fn().mockResolvedValue(projects),
    };
  }

  /** Helper: create a mock source that throws on scan. */
  function createFailingSource(type: DiscoveredProject["source"]): DiscoverySource {
    return {
      type,
      scan: vi.fn().mockRejectedValue(new Error(`${type} scan failed`)),
    };
  }

  it("scanAll runs all enabled sources and returns found count", async () => {
    const fsSource = createMockSource("filesystem", [
      { name: "Alpha", slug: "alpha", source: "filesystem" },
    ]);
    const ghSource = createMockSource("github", [
      { name: "Beta", slug: "beta", source: "github", githubRepo: "org/beta" },
    ]);

    const { registerSource, scanAll } = await import("@/lib/discovery/scanner");
    registerSource(fsSource);
    registerSource(ghSource);

    mockSourcesFindMany.mockResolvedValue([
      { id: "s1", type: "filesystem", name: "Local", enabled: true, config: { path: ".." } },
      { id: "s2", type: "github", name: "GitHub", enabled: true, config: { token: "t" } },
    ]);

    const result = await scanAll();

    expect(fsSource.scan).toHaveBeenCalled();
    expect(ghSource.scan).toHaveBeenCalled();
    expect(result.found).toBe(2);
    expect(result.sources).toHaveLength(2);
    expect(result.sources[0].found).toBe(1);
    expect(result.sources[1].found).toBe(1);
  });

  it("disabled sources are skipped (not in enabled query results)", async () => {
    const fsSource = createMockSource("filesystem", [
      { name: "Alpha", slug: "alpha", source: "filesystem" },
    ]);
    const dokploySource = createMockSource("dokploy", [
      { name: "Gamma", slug: "gamma", source: "dokploy" },
    ]);

    const { registerSource, scanAll } = await import("@/lib/discovery/scanner");
    registerSource(fsSource);
    registerSource(dokploySource);

    // Only filesystem is enabled; dokploy is disabled (not returned by findMany)
    mockSourcesFindMany.mockResolvedValue([
      { id: "s1", type: "filesystem", name: "Local", enabled: true, config: { path: ".." } },
    ]);

    const result = await scanAll();

    expect(fsSource.scan).toHaveBeenCalled();
    expect(dokploySource.scan).not.toHaveBeenCalled();
    expect(result.found).toBe(1);
  });

  it("source errors are captured in results, not thrown", async () => {
    const failingSource = createFailingSource("dokploy");

    const { registerSource, scanAll } = await import("@/lib/discovery/scanner");
    registerSource(failingSource);

    mockSourcesFindMany.mockResolvedValue([
      { id: "s1", type: "dokploy", name: "Broken Dokploy", enabled: true, config: {} },
    ]);

    // Should not throw
    const result = await scanAll();

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].error).toContain("dokploy scan failed");
    expect(result.sources[0].found).toBe(0);
    expect(result.found).toBe(0);
  });

  it("projects discovered by multiple sources are merged by slug", async () => {
    const fsSource = createMockSource("filesystem", [
      { name: "Alpha", slug: "alpha", source: "filesystem", localPath: "/home/alpha", techStack: ["node"] },
    ]);
    const ghSource = createMockSource("github", [
      { name: "Alpha", slug: "alpha", source: "github", githubRepo: "org/alpha", techStack: ["typescript"] },
    ]);

    const { registerSource, scanAll } = await import("@/lib/discovery/scanner");
    registerSource(fsSource);
    registerSource(ghSource);

    mockSourcesFindMany.mockResolvedValue([
      { id: "s1", type: "filesystem", name: "Local", enabled: true, config: { path: ".." } },
      { id: "s2", type: "github", name: "GitHub", enabled: true, config: { token: "t" } },
    ]);

    const result = await scanAll();

    // Two sources found the same slug — should be merged into 1
    expect(result.found).toBe(1);
    expect(mockInsertValues).toHaveBeenCalled();
  });

  it("unregistered source types are reported as errors in source summary", async () => {
    const { scanAll } = await import("@/lib/discovery/scanner");

    mockSourcesFindMany.mockResolvedValue([
      { id: "s-unreg", type: "coolify" as never, name: "Coolify", enabled: true, config: {} },
    ]);

    const result = await scanAll();

    const coolifySource = result.sources.find((s) => s.name === "Coolify");
    expect(coolifySource).toBeDefined();
    expect(coolifySource!.error).toContain("No implementation registered");
    expect(coolifySource!.found).toBe(0);
  });

  it("existing projects are updated rather than re-created", async () => {
    const fsSource = createMockSource("filesystem", [
      { name: "Alpha", slug: "alpha", source: "filesystem", localPath: "/home/alpha" },
    ]);

    const { registerSource, scanAll } = await import("@/lib/discovery/scanner");
    registerSource(fsSource);

    mockSourcesFindMany.mockResolvedValue([
      { id: "s1", type: "filesystem", name: "Local", enabled: true, config: { path: ".." } },
    ]);

    // Project already exists in DB
    mockProjectsFindFirst.mockResolvedValue({
      id: "proj-existing",
      slug: "alpha",
      localPath: "/old/path",
      githubRepo: null,
      dokployAppId: null,
      techStack: ["node"],
    });

    const result = await scanAll();

    expect(result.found).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
    expect(mockUpdateSetWhere).toHaveBeenCalled();
  });

  it("new projects are created with status discovered", async () => {
    const fsSource = createMockSource("filesystem", [
      { name: "NewProject", slug: "new-project", source: "filesystem" },
    ]);

    const { registerSource, scanAll } = await import("@/lib/discovery/scanner");
    registerSource(fsSource);

    mockSourcesFindMany.mockResolvedValue([
      { id: "s1", type: "filesystem", name: "Local", enabled: true, config: {} },
    ]);

    mockProjectsFindFirst.mockResolvedValue(null);

    const result = await scanAll();

    expect(result.found).toBe(1);
    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(mockInsertValues).toHaveBeenCalled();
  });
});

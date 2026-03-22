/**
 * Tests for project-scoped permission checking.
 *
 * Verifies the permission resolution order:
 * 1. Superadmin bypasses all checks
 * 2. Project membership determines role-based permissions
 * 3. Global viewers get read-only access
 * 4. Non-members are denied
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/connection", () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
      projectMemberships: { findFirst: vi.fn() },
      projects: { findFirst: vi.fn() },
    },
  },
}));

import {
  checkProjectPermission,
  requireProjectPermission,
  resolveProjectId,
} from "./permissions";
import { db } from "@/db/connection";
import { ApiError } from "@/lib/api/errors";

const mockDb = vi.mocked(db);

describe("checkProjectPermission", () => {
  const userId = "user-001";
  const projectId = "proj-001";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows superadmin to perform any action", async () => {
    mockDb.query.users.findFirst.mockResolvedValue({
      id: userId,
      role: "superadmin",
    } as never);

    const canDeploy = await checkProjectPermission(userId, projectId, "deploy");
    const canConfig = await checkProjectPermission(userId, projectId, "config.write");
    const canRead = await checkProjectPermission(userId, projectId, "read");

    expect(canDeploy).toBe(true);
    expect(canConfig).toBe(true);
    expect(canRead).toBe(true);
  });

  it("allows project admin to read, write config, deploy, manage alerts, and run tests", async () => {
    mockDb.query.users.findFirst.mockResolvedValue({
      id: userId,
      role: "user",
    } as never);
    mockDb.query.projectMemberships.findFirst.mockResolvedValue({
      userId,
      projectId,
      role: "admin",
    } as never);

    expect(await checkProjectPermission(userId, projectId, "read")).toBe(true);
    expect(await checkProjectPermission(userId, projectId, "config.write")).toBe(true);
    expect(await checkProjectPermission(userId, projectId, "deploy")).toBe(true);
    expect(await checkProjectPermission(userId, projectId, "alert.manage")).toBe(true);
    expect(await checkProjectPermission(userId, projectId, "test.run")).toBe(true);
  });

  it("allows project viewer to read but denies write actions", async () => {
    mockDb.query.users.findFirst.mockResolvedValue({
      id: userId,
      role: "user",
    } as never);
    mockDb.query.projectMemberships.findFirst.mockResolvedValue({
      userId,
      projectId,
      role: "viewer",
    } as never);

    expect(await checkProjectPermission(userId, projectId, "read")).toBe(true);
    expect(await checkProjectPermission(userId, projectId, "config.write")).toBe(false);
    expect(await checkProjectPermission(userId, projectId, "deploy")).toBe(false);
    expect(await checkProjectPermission(userId, projectId, "alert.manage")).toBe(false);
    expect(await checkProjectPermission(userId, projectId, "test.run")).toBe(false);
  });

  it("denies all access for non-members without global viewer role", async () => {
    mockDb.query.users.findFirst.mockResolvedValue({
      id: userId,
      role: "user",
    } as never);
    mockDb.query.projectMemberships.findFirst.mockResolvedValue(
      undefined as never
    );

    expect(await checkProjectPermission(userId, projectId, "read")).toBe(false);
    expect(await checkProjectPermission(userId, projectId, "deploy")).toBe(false);
  });

  it("allows global viewer to read any project", async () => {
    mockDb.query.users.findFirst.mockResolvedValue({
      id: userId,
      role: "viewer",
    } as never);
    mockDb.query.projectMemberships.findFirst.mockResolvedValue(
      undefined as never
    );

    expect(await checkProjectPermission(userId, projectId, "read")).toBe(true);
  });

  it("denies global viewer from non-read actions", async () => {
    mockDb.query.users.findFirst.mockResolvedValue({
      id: userId,
      role: "viewer",
    } as never);
    mockDb.query.projectMemberships.findFirst.mockResolvedValue(
      undefined as never
    );

    expect(await checkProjectPermission(userId, projectId, "config.write")).toBe(false);
    expect(await checkProjectPermission(userId, projectId, "deploy")).toBe(false);
  });

  it("denies access when user does not exist in DB", async () => {
    mockDb.query.users.findFirst.mockResolvedValue(undefined as never);

    const result = await checkProjectPermission("user-unknown", projectId, "read");

    expect(result).toBe(false);
  });

  it("allows anonymous user to bypass all checks", async () => {
    const result = await checkProjectPermission("anonymous", projectId, "deploy");

    expect(result).toBe(true);
    // Should not query the DB at all for anonymous
    expect(mockDb.query.users.findFirst).not.toHaveBeenCalled();
  });

  it("handles unknown membership roles by denying access", async () => {
    mockDb.query.users.findFirst.mockResolvedValue({
      id: userId,
      role: "user",
    } as never);
    mockDb.query.projectMemberships.findFirst.mockResolvedValue({
      userId,
      projectId,
      role: "unknown-role",
    } as never);

    expect(await checkProjectPermission(userId, projectId, "read")).toBe(false);
  });
});

describe("resolveProjectId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the project ID for a valid slug", async () => {
    mockDb.query.projects.findFirst.mockResolvedValue({
      id: "proj-abc",
    } as never);

    const id = await resolveProjectId("my-project");

    expect(id).toBe("proj-abc");
  });

  it("throws NOT_FOUND for an unknown slug", async () => {
    mockDb.query.projects.findFirst.mockResolvedValue(undefined as never);

    await expect(resolveProjectId("nonexistent")).rejects.toThrow(ApiError);
    await expect(resolveProjectId("nonexistent")).rejects.toThrow("not found");
  });
});

describe("requireProjectPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves slug and allows permitted action", async () => {
    mockDb.query.projects.findFirst.mockResolvedValue({
      id: "proj-001",
    } as never);
    mockDb.query.users.findFirst.mockResolvedValue({
      id: "user-001",
      role: "superadmin",
    } as never);

    await expect(
      requireProjectPermission("user-001", "my-project", "deploy")
    ).resolves.toBeUndefined();
  });

  it("throws FORBIDDEN when user lacks permission", async () => {
    mockDb.query.projects.findFirst.mockResolvedValue({
      id: "proj-001",
    } as never);
    mockDb.query.users.findFirst.mockResolvedValue({
      id: "user-001",
      role: "user",
    } as never);
    mockDb.query.projectMemberships.findFirst.mockResolvedValue(
      undefined as never
    );

    await expect(
      requireProjectPermission("user-001", "my-project", "deploy")
    ).rejects.toThrow(ApiError);
  });
});

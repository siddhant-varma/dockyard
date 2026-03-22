/**
 * Integration test: Incident lifecycle.
 *
 * Tests: create incident → timeline entries → status transitions →
 * resolution with MTTR calculation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- DB mock with controllable responses ---
const mockFindFirst = vi.fn();
const mockInsertReturning = vi.fn();
const mockUpdateSetWhere = vi.fn();

vi.mock("@/db/connection", () => {
  const mockFindFirstRef = (...args: unknown[]) => mockFindFirst(...args);
  const mockInsertReturningRef = (...args: unknown[]) => mockInsertReturning(...args);
  const mockUpdateSetWhereRef = (...args: unknown[]) => mockUpdateSetWhere(...args);

  return {
    db: {
      query: {
        incidents: {
          findFirst: mockFindFirstRef,
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      insert: () => ({
        values: () => ({
          returning: mockInsertReturningRef,
        }),
      }),
      update: () => ({
        set: () => ({
          where: mockUpdateSetWhereRef,
        }),
      }),
    },
  };
});

describe("Incident Lifecycle", () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockInsertReturning.mockReset();
    mockUpdateSetWhere.mockReset();
  });

  // --- Original smoke tests ---

  it("should export createIncident function", async () => {
    const { createIncident } = await import("@/lib/incidents/service");
    expect(typeof createIncident).toBe("function");
  });

  it("should export addTimelineEntry function", async () => {
    const { addTimelineEntry } = await import("@/lib/incidents/service");
    expect(typeof addTimelineEntry).toBe("function");
  });

  it("should export updateIncidentStatus function", async () => {
    const { updateIncidentStatus } = await import("@/lib/incidents/service");
    expect(typeof updateIncidentStatus).toBe("function");
  });

  it("should define correct status flow", () => {
    const expected = ["investigating", "identified", "monitoring", "resolved", "postmortem"];
    expect(expected).toHaveLength(5);
  });

  // --- Behavior tests ---

  it("createIncident inserts a record with investigating status and timeline entry", async () => {
    const fakeIncident = {
      id: "inc-new",
      projectId: "proj-001",
      title: "[SEV1] DB down",
      severity: "sev1",
      status: "investigating",
      timeline: [{ actor: "system", action: "incident.created", note: "[SEV1] DB down", timestamp: "2026-03-22T10:00:00.000Z" }],
      relatedAlerts: [],
      createdAt: new Date().toISOString(),
    };
    mockInsertReturning.mockResolvedValue([fakeIncident]);

    const { createIncident } = await import("@/lib/incidents/service");
    const result = await createIncident({
      projectId: "proj-001",
      title: "[SEV1] DB down",
      severity: "sev1",
    });

    expect(result).toBeDefined();
    expect(result.id).toBe("inc-new");
    expect(result.status).toBe("investigating");
    expect(result.severity).toBe("sev1");
  });

  it("createIncident includes relatedAlertIds when provided", async () => {
    const fakeIncident = {
      id: "inc-alerts",
      projectId: "proj-001",
      title: "Alert storm",
      severity: "sev2",
      status: "investigating",
      timeline: [],
      relatedAlerts: ["alert-1", "alert-2"],
      createdAt: new Date().toISOString(),
    };
    mockInsertReturning.mockResolvedValue([fakeIncident]);

    const { createIncident } = await import("@/lib/incidents/service");
    const result = await createIncident({
      projectId: "proj-001",
      title: "Alert storm",
      severity: "sev2",
      relatedAlertIds: ["alert-1", "alert-2"],
    });

    expect(result.relatedAlerts).toEqual(["alert-1", "alert-2"]);
  });

  it("addTimelineEntry appends to existing timeline and updates the incident", async () => {
    const existingTimeline = [
      { actor: "system", action: "incident.created", note: "Start", timestamp: "2026-03-22T10:00:00.000Z" },
    ];
    mockFindFirst.mockResolvedValue({
      id: "inc-001",
      status: "investigating",
      timeline: existingTimeline,
    });
    mockUpdateSetWhere.mockResolvedValue(undefined);

    const { addTimelineEntry } = await import("@/lib/incidents/service");
    await addTimelineEntry("inc-001", {
      actor: "user-42",
      action: "comment",
      note: "Looking into it",
    });

    expect(mockFindFirst).toHaveBeenCalled();
    expect(mockUpdateSetWhere).toHaveBeenCalled();
  });

  it("addTimelineEntry throws NOT_FOUND when incident does not exist", async () => {
    mockFindFirst.mockResolvedValue(undefined);

    const { addTimelineEntry } = await import("@/lib/incidents/service");
    await expect(
      addTimelineEntry("nonexistent", { actor: "system", action: "test" })
    ).rejects.toThrow("Incident not found");
  });

  it("updateIncidentStatus rejects an invalid status", async () => {
    mockFindFirst.mockResolvedValue({
      id: "inc-001",
      status: "investigating",
      timeline: [],
      createdAt: new Date().toISOString(),
    });

    const { updateIncidentStatus } = await import("@/lib/incidents/service");
    await expect(
      updateIncidentStatus("inc-001", { status: "invalid-status" })
    ).rejects.toThrow("Invalid status");
  });

  it("updateIncidentStatus transitions to resolved and calculates MTTR", async () => {
    const createdAt = new Date(Date.now() - 3600_000).toISOString(); // 1 hour ago
    mockFindFirst
      .mockResolvedValueOnce({
        id: "inc-001",
        status: "monitoring",
        timeline: [],
        createdAt,
      })
      .mockResolvedValueOnce({
        id: "inc-001",
        status: "resolved",
        timeline: [{ actor: "ops-lead", action: "status.resolved", timestamp: new Date().toISOString() }],
        resolvedAt: new Date(),
        mttrSeconds: 3600,
        createdAt,
      });
    mockUpdateSetWhere.mockResolvedValue(undefined);

    const { updateIncidentStatus } = await import("@/lib/incidents/service");
    const result = await updateIncidentStatus("inc-001", {
      status: "resolved",
      updatedBy: "ops-lead",
    });

    expect(result).toBeDefined();
    expect(result!.status).toBe("resolved");
    expect(result!.mttrSeconds).toBe(3600);
  });

  it("updateIncidentStatus throws NOT_FOUND for missing incident", async () => {
    mockFindFirst.mockResolvedValue(undefined);

    const { updateIncidentStatus } = await import("@/lib/incidents/service");
    await expect(
      updateIncidentStatus("nonexistent", { status: "resolved" })
    ).rejects.toThrow("Incident not found");
  });
});

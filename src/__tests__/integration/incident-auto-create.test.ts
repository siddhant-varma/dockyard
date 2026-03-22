/**
 * Integration test: Automatic incident creation from high-severity alerts.
 *
 * Tests: SEV1/SEV2 trigger incident creation, SEV3/SEV4 do not,
 * duplicate alerts link to existing open incidents rather than creating new ones.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Controllable DB mocks ---
const mockIncidentFindFirst = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn();
const mockUpdateSetWhere = vi.fn();

vi.mock("@/db/connection", () => {
  const incidentFindFirstRef = (...args: unknown[]) => mockIncidentFindFirst(...args);
  const insertValuesRef = (...args: unknown[]) => {
    mockInsertValues(...args);
    return { returning: (...rArgs: unknown[]) => mockInsertReturning(...rArgs) };
  };
  const updateSetWhereRef = (...args: unknown[]) => mockUpdateSetWhere(...args);

  return {
    db: {
      query: {
        incidents: {
          findFirst: incidentFindFirstRef,
          findMany: vi.fn().mockResolvedValue([]),
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
    },
  };
});

describe("Incident Auto-Create", () => {
  beforeEach(() => {
    mockIncidentFindFirst.mockReset();
    mockInsertReturning.mockReset();
    mockInsertValues.mockReset();
    mockUpdateSetWhere.mockReset();

    // Default: no existing open incidents
    mockIncidentFindFirst.mockResolvedValue(null);
    mockUpdateSetWhere.mockResolvedValue(undefined);
  });

  it("SEV1 alert creates a new incident", async () => {
    const newIncident = {
      id: "inc-sev1",
      projectId: "proj-001",
      title: "[SEV1] Database unreachable",
      severity: "sev1",
      status: "investigating",
      timeline: [],
      relatedAlerts: ["alert-sev1"],
      createdAt: new Date().toISOString(),
    };
    // Call 1: findRecentOpenIncident → null (no existing)
    // Call 2: addTimelineEntry looks up the newly created incident
    mockIncidentFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(newIncident);
    mockInsertReturning.mockResolvedValue([newIncident]);

    const { autoCreateIncident } = await import("@/lib/incidents/auto-create");
    const result = await autoCreateIncident("proj-001", {
      id: "alert-sev1",
      ruleId: "rule-001",
      projectId: "proj-001",
      severity: "sev1",
      message: "Database unreachable",
    });

    expect(result).not.toBeNull();
    expect(result!.id).toBe("inc-sev1");
    expect(result!.severity).toBe("sev1");
    expect(mockInsertReturning).toHaveBeenCalled();
  });

  it("SEV2 alert creates a new incident", async () => {
    const newIncident = {
      id: "inc-sev2",
      projectId: "proj-001",
      title: "[SEV2] High error rate",
      severity: "sev2",
      status: "investigating",
      timeline: [],
      relatedAlerts: ["alert-sev2"],
      createdAt: new Date().toISOString(),
    };
    // Call 1: findRecentOpenIncident → null
    // Call 2: addTimelineEntry looks up the newly created incident
    mockIncidentFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(newIncident);
    mockInsertReturning.mockResolvedValue([newIncident]);

    const { autoCreateIncident } = await import("@/lib/incidents/auto-create");
    const result = await autoCreateIncident("proj-001", {
      id: "alert-sev2",
      ruleId: "rule-002",
      projectId: "proj-001",
      severity: "sev2",
      message: "High error rate",
    });

    expect(result).not.toBeNull();
    expect(result!.id).toBe("inc-sev2");
    expect(result!.severity).toBe("sev2");
  });

  it("SEV3 alert does NOT create an incident", async () => {
    const { autoCreateIncident } = await import("@/lib/incidents/auto-create");
    const result = await autoCreateIncident("proj-001", {
      id: "alert-sev3",
      ruleId: "rule-003",
      projectId: "proj-001",
      severity: "sev3",
      message: "Elevated latency",
    });

    expect(result).toBeNull();
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it("SEV4 alert does NOT create an incident", async () => {
    const { autoCreateIncident } = await import("@/lib/incidents/auto-create");
    const result = await autoCreateIncident("proj-001", {
      id: "alert-sev4",
      ruleId: "rule-004",
      projectId: "proj-001",
      severity: "sev4",
      message: "Info: disk cleanup scheduled",
    });

    expect(result).toBeNull();
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it("duplicate SEV1 alert links to existing open incident instead of creating new", async () => {
    const existingIncident = {
      id: "inc-existing",
      projectId: "proj-001",
      title: "[SEV1] Previous alert",
      severity: "sev1",
      status: "investigating",
      timeline: [],
      relatedAlerts: ["alert-prev"],
      createdAt: new Date(Date.now() - 10 * 60_000).toISOString(),
    };

    // First call: findRecentOpenIncident query returns existing incident
    // Second call: linkAlertToIncident loads the incident to get relatedAlerts
    // Third call: addTimelineEntry loads the incident to append timeline
    mockIncidentFindFirst
      .mockResolvedValueOnce(existingIncident)   // findRecentOpenIncident
      .mockResolvedValueOnce(existingIncident)   // linkAlertToIncident lookup
      .mockResolvedValueOnce(existingIncident);  // addTimelineEntry lookup

    const { autoCreateIncident } = await import("@/lib/incidents/auto-create");
    const result = await autoCreateIncident("proj-001", {
      id: "alert-dup",
      ruleId: "rule-001",
      projectId: "proj-001",
      severity: "sev1",
      message: "Same issue, different alert",
    });

    // Should return the existing incident, not a new one
    expect(result).not.toBeNull();
    expect(result!.id).toBe("inc-existing");
  });

  it("alert with null message still generates a title", async () => {
    const newIncident = {
      id: "inc-no-msg",
      projectId: "proj-001",
      title: "[SEV1] Auto-created incident",
      severity: "sev1",
      status: "investigating",
      timeline: [],
      relatedAlerts: ["alert-no-msg"],
      createdAt: new Date().toISOString(),
    };
    // Call 1: findRecentOpenIncident → null
    // Call 2: addTimelineEntry looks up the newly created incident
    mockIncidentFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(newIncident);
    mockInsertReturning.mockResolvedValue([newIncident]);

    const { autoCreateIncident } = await import("@/lib/incidents/auto-create");
    const result = await autoCreateIncident("proj-001", {
      id: "alert-no-msg",
      ruleId: "rule-005",
      projectId: "proj-001",
      severity: "sev1",
      message: null,
    });

    expect(result).not.toBeNull();
    expect(result!.title).toContain("SEV1");
  });

  it("already-linked alert is not re-added to relatedAlerts", async () => {
    const existingIncident = {
      id: "inc-already-linked",
      projectId: "proj-001",
      title: "[SEV2] Known issue",
      severity: "sev2",
      status: "investigating",
      timeline: [],
      relatedAlerts: ["alert-already-linked"],
      createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    };

    mockIncidentFindFirst
      .mockResolvedValueOnce(existingIncident)   // findRecentOpenIncident
      .mockResolvedValueOnce(existingIncident);  // linkAlertToIncident lookup

    const { autoCreateIncident } = await import("@/lib/incidents/auto-create");
    const result = await autoCreateIncident("proj-001", {
      id: "alert-already-linked",
      ruleId: "rule-002",
      projectId: "proj-001",
      severity: "sev2",
      message: "Repeat",
    });

    expect(result!.id).toBe("inc-already-linked");
    // update should NOT have been called since the alert is already in relatedAlerts
    expect(mockUpdateSetWhere).not.toHaveBeenCalled();
  });
});

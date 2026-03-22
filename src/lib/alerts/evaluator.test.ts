/**
 * Tests for the alert evaluation engine.
 *
 * Verifies that evaluateAlerts correctly processes alert rules
 * against project health/metrics, handles deduplication, and
 * returns properly grouped results.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildAlertRule } from "../../../test/helpers/fixtures";

// Mock DB before importing the module under test
vi.mock("@/db/connection", () => ({
  db: {
    query: {
      alertRules: { findMany: vi.fn(), findFirst: vi.fn() },
      projectHealth: { findFirst: vi.fn() },
      alertEvents: { findFirst: vi.fn() },
      projects: { findFirst: vi.fn() },
    },
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("./deduplication", () => ({
  isDuplicate: vi.fn(),
}));

vi.mock("./grouping", () => ({
  groupAlerts: vi.fn(),
}));

import { evaluateAlerts } from "./evaluator";
import { db } from "@/db/connection";
import { isDuplicate } from "./deduplication";
import { groupAlerts } from "./grouping";

const mockDb = vi.mocked(db);
const mockIsDuplicate = vi.mocked(isDuplicate);
const mockGroupAlerts = vi.mocked(groupAlerts);

describe("evaluateAlerts", () => {
  const projectId = "proj-001";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGroupAlerts.mockResolvedValue([]);
  });

  it("fires an alert when health_status rule matches a down project", async () => {
    const rule = buildAlertRule({
      id: "rule-health-down",
      projectId,
      name: "Service Down",
      metric: "health_status",
      operator: "==",
      threshold: 0,
      severity: "sev1",
      enabled: true,
      runbookUrl: null,
    });

    mockDb.query.alertRules.findMany.mockResolvedValue([rule]);
    mockDb.query.projectHealth.findFirst.mockResolvedValue({
      projectId,
      overallStatus: "down",
    } as never);
    mockIsDuplicate.mockResolvedValue(false);

    const insertedAlert = {
      id: "evt-100",
      severity: "sev1",
      message: `Alert: Service Down — health_status == 0`,
      context: {},
    };
    const mockReturning = vi.fn().mockResolvedValue([insertedAlert]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    mockDb.insert.mockReturnValue({ values: mockValues } as never);

    const result = await evaluateAlerts(projectId);

    expect(result.alertsFired).toBe(1);
    expect(result.alertIds).toContain("evt-100");
    expect(result.rulesEvaluated).toBe(1);
  });

  it("does not fire when health is not down", async () => {
    const rule = buildAlertRule({
      id: "rule-health-down",
      projectId,
      metric: "health_status",
      operator: "==",
      threshold: 0,
      enabled: true,
      runbookUrl: null,
    });

    mockDb.query.alertRules.findMany.mockResolvedValue([rule]);
    mockDb.query.projectHealth.findFirst.mockResolvedValue({
      projectId,
      overallStatus: "healthy",
    } as never);

    const result = await evaluateAlerts(projectId);

    expect(result.alertsFired).toBe(0);
    expect(result.alertIds).toHaveLength(0);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("skips disabled rules (only enabled rules are fetched)", async () => {
    // The query filters by enabled=true, so disabled rules never appear
    mockDb.query.alertRules.findMany.mockResolvedValue([]);

    const result = await evaluateAlerts(projectId);

    expect(result.rulesEvaluated).toBe(0);
    expect(result.alertsFired).toBe(0);
  });

  it("filters rules to only applicable ones (matching projectId or null)", async () => {
    const projectRule = buildAlertRule({
      id: "rule-1",
      projectId,
      metric: "health_status",
      operator: "==",
      threshold: 0,
      enabled: true,
      runbookUrl: null,
    });
    const globalRule = buildAlertRule({
      id: "rule-2",
      projectId: null,
      metric: "health_status",
      operator: "==",
      threshold: 0,
      enabled: true,
      runbookUrl: null,
    });
    const otherProjectRule = buildAlertRule({
      id: "rule-3",
      projectId: "proj-other",
      metric: "health_status",
      operator: "==",
      threshold: 0,
      enabled: true,
      runbookUrl: null,
    });

    mockDb.query.alertRules.findMany.mockResolvedValue([
      projectRule,
      globalRule,
      otherProjectRule,
    ]);
    mockDb.query.projectHealth.findFirst.mockResolvedValue({
      projectId,
      overallStatus: "down",
    } as never);
    mockIsDuplicate.mockResolvedValue(false);

    const insertedAlert = {
      id: "evt-200",
      severity: "sev1",
      message: "Alert fired",
      context: {},
    };
    const mockReturning = vi.fn().mockResolvedValue([insertedAlert]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    mockDb.insert.mockReturnValue({ values: mockValues } as never);

    const result = await evaluateAlerts(projectId);

    // 2 applicable rules (project-specific + global), not the other-project one
    expect(result.rulesEvaluated).toBe(2);
  });

  it("suppresses duplicate alerts and counts them", async () => {
    const rule = buildAlertRule({
      id: "rule-dup",
      projectId,
      metric: "health_status",
      operator: "==",
      threshold: 0,
      enabled: true,
      runbookUrl: null,
    });

    mockDb.query.alertRules.findMany.mockResolvedValue([rule]);
    mockDb.query.projectHealth.findFirst.mockResolvedValue({
      projectId,
      overallStatus: "down",
    } as never);
    mockIsDuplicate.mockResolvedValue(true);

    const result = await evaluateAlerts(projectId);

    expect(result.deduplicated).toBe(1);
    expect(result.alertsFired).toBe(0);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("propagates severity from rule to alert event", async () => {
    const rule = buildAlertRule({
      id: "rule-sev3",
      projectId,
      metric: "health_status",
      operator: "==",
      threshold: 0,
      severity: "sev3",
      enabled: true,
      runbookUrl: "https://wiki.example.com/runbook",
    });

    mockDb.query.alertRules.findMany.mockResolvedValue([rule]);
    mockDb.query.projectHealth.findFirst.mockResolvedValue({
      projectId,
      overallStatus: "down",
    } as never);
    mockIsDuplicate.mockResolvedValue(false);

    const insertedAlert = {
      id: "evt-sev3",
      severity: "sev3",
      message: "Alert: High CPU — health_status == 0",
      context: {},
    };
    const mockReturning = vi.fn().mockResolvedValue([insertedAlert]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    mockDb.insert.mockReturnValue({ values: mockValues } as never);

    await evaluateAlerts(projectId);

    const insertCall = mockDb.insert.mock.calls[0];
    expect(insertCall).toBeDefined();
    const valuesCall = mockValues.mock.calls[0][0];
    expect(valuesCall.severity).toBe("sev3");
  });

  it("returns no health data gracefully (health record missing)", async () => {
    const rule = buildAlertRule({
      id: "rule-no-health",
      projectId,
      metric: "health_status",
      operator: "==",
      threshold: 0,
      enabled: true,
      runbookUrl: null,
    });

    mockDb.query.alertRules.findMany.mockResolvedValue([rule]);
    mockDb.query.projectHealth.findFirst.mockResolvedValue(undefined as never);

    const result = await evaluateAlerts(projectId);

    expect(result.alertsFired).toBe(0);
  });

  it("does not fire for deploy_status metric (currently unsupported)", async () => {
    const rule = buildAlertRule({
      id: "rule-deploy",
      projectId,
      metric: "deploy_status",
      operator: "==",
      threshold: 0,
      enabled: true,
      runbookUrl: null,
    });

    mockDb.query.alertRules.findMany.mockResolvedValue([rule]);

    const result = await evaluateAlerts(projectId);

    expect(result.alertsFired).toBe(0);
  });

  it("passes pending alerts to groupAlerts and returns groups", async () => {
    const rule = buildAlertRule({
      id: "rule-grp",
      projectId,
      metric: "health_status",
      operator: "==",
      threshold: 0,
      severity: "sev2",
      enabled: true,
      runbookUrl: null,
    });

    mockDb.query.alertRules.findMany.mockResolvedValue([rule]);
    mockDb.query.projectHealth.findFirst.mockResolvedValue({
      projectId,
      overallStatus: "down",
    } as never);
    mockIsDuplicate.mockResolvedValue(false);

    const insertedAlert = {
      id: "evt-grp",
      severity: "sev2",
      message: "Alert: High CPU — health_status == 0",
      context: { metric: "health_status" },
    };
    const mockReturning = vi.fn().mockResolvedValue([insertedAlert]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    mockDb.insert.mockReturnValue({ values: mockValues } as never);

    const fakeGroup = {
      groupId: "grp-1",
      projectId,
      projectName: "Test Project",
      severity: "sev2",
      alerts: [],
      groupMessage: "1 alert",
    };
    mockGroupAlerts.mockResolvedValue([fakeGroup]);

    const result = await evaluateAlerts(projectId);

    expect(mockGroupAlerts).toHaveBeenCalledWith([
      expect.objectContaining({ id: "evt-grp", projectId }),
    ]);
    expect(result.groups).toEqual([fakeGroup]);
  });

  it("handles unknown metric types without crashing", async () => {
    const rule = buildAlertRule({
      id: "rule-unknown",
      projectId,
      metric: "unknown_metric",
      operator: ">",
      threshold: 50,
      enabled: true,
      runbookUrl: null,
    });

    mockDb.query.alertRules.findMany.mockResolvedValue([rule]);

    const result = await evaluateAlerts(projectId);

    expect(result.alertsFired).toBe(0);
    expect(result.rulesEvaluated).toBe(1);
  });
});

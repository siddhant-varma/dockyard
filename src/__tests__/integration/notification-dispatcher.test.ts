/**
 * Integration test: Notification dispatcher.
 *
 * Tests: channel routing, failure handling, multi-channel dispatch,
 * and no-op when no channels are configured.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Controllable DB mocks ---
const mockRuleFindFirst = vi.fn();
const mockChannelsFindMany = vi.fn();

vi.mock("@/db/connection", () => {
  const ruleFindFirstRef = (...args: unknown[]) => mockRuleFindFirst(...args);
  const channelsFindManyRef = (...args: unknown[]) => mockChannelsFindMany(...args);

  return {
    db: {
      query: {
        alertRules: {
          findFirst: ruleFindFirstRef,
        },
        notificationChannels: {
          findMany: channelsFindManyRef,
        },
      },
    },
  };
});

// --- Mock the notification channel factory ---
const mockSend = vi.fn();

vi.mock("@/lib/notifications/index", () => ({
  getChannel: (_type: string, _config: unknown) => ({
    send: (...args: unknown[]) => mockSend(...args),
    validate: vi.fn().mockResolvedValue(true),
  }),
}));

describe("Notification Dispatcher", () => {
  beforeEach(() => {
    mockRuleFindFirst.mockReset();
    mockChannelsFindMany.mockReset();
    mockSend.mockReset();
  });

  it("dispatches alert to correct channel type based on rule config", async () => {
    mockRuleFindFirst.mockResolvedValue({
      id: "rule-001",
      name: "High CPU",
      notificationChannels: ["slack"],
    });
    mockChannelsFindMany.mockResolvedValue([
      { id: "ch-1", type: "slack", name: "Ops Slack", enabled: true, config: { webhookUrl: "https://hooks.slack.com/..." } },
    ]);
    mockSend.mockResolvedValue({ success: true, messageId: "msg-001" });

    const { dispatchAlert } = await import("@/lib/notifications/dispatcher");
    const result = await dispatchAlert({
      id: "evt-001",
      ruleId: "rule-001",
      projectId: "proj-001",
      severity: "sev2",
      message: "CPU at 95%",
    });

    expect(result.alertEventId).toBe("evt-001");
    expect(result.channels).toHaveLength(1);
    expect(result.channels[0].type).toBe("slack");
    expect(result.channels[0].result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("handles channel send failure gracefully without throwing", async () => {
    mockRuleFindFirst.mockResolvedValue({
      id: "rule-002",
      name: "Disk Full",
      notificationChannels: ["email"],
    });
    mockChannelsFindMany.mockResolvedValue([
      { id: "ch-2", type: "email", name: "Admin Email", enabled: true, config: { email: "admin@test.com" } },
    ]);
    mockSend.mockRejectedValue(new Error("SMTP connection refused"));

    const { dispatchAlert } = await import("@/lib/notifications/dispatcher");
    const result = await dispatchAlert({
      id: "evt-002",
      ruleId: "rule-002",
      projectId: "proj-001",
      severity: "sev1",
      message: "Disk 99% full",
    });

    // Should not throw — failure captured in result
    expect(result.channels).toHaveLength(1);
    expect(result.channels[0].result.success).toBe(false);
    expect(result.channels[0].result.error).toContain("SMTP connection refused");
  });

  it("dispatches to multiple channels when rule has several configured", async () => {
    mockRuleFindFirst.mockResolvedValue({
      id: "rule-003",
      name: "Service Down",
      notificationChannels: ["slack", "email", "webhook"],
    });
    mockChannelsFindMany.mockResolvedValue([
      { id: "ch-1", type: "slack", name: "Ops Slack", enabled: true, config: { webhookUrl: "https://hooks.slack.com/..." } },
      { id: "ch-2", type: "email", name: "Admin Email", enabled: true, config: { email: "admin@test.com" } },
      { id: "ch-3", type: "webhook", name: "PagerDuty", enabled: true, config: { url: "https://pd.example.com" } },
    ]);
    mockSend.mockResolvedValue({ success: true });

    const { dispatchAlert } = await import("@/lib/notifications/dispatcher");
    const result = await dispatchAlert({
      id: "evt-003",
      ruleId: "rule-003",
      projectId: "proj-001",
      severity: "sev1",
      message: "Service down",
    });

    expect(result.channels).toHaveLength(3);
    expect(mockSend).toHaveBeenCalledTimes(3);
    expect(result.channels.map((c) => c.type)).toEqual(["slack", "email", "webhook"]);
  });

  it("returns empty channels array when rule has no notification channels", async () => {
    mockRuleFindFirst.mockResolvedValue({
      id: "rule-silent",
      name: "Silent Rule",
      notificationChannels: [],
    });

    const { dispatchAlert } = await import("@/lib/notifications/dispatcher");
    const result = await dispatchAlert({
      id: "evt-004",
      ruleId: "rule-silent",
      projectId: "proj-001",
      severity: "sev3",
      message: "Something minor",
    });

    expect(result.channels).toEqual([]);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("skips channel types not found in DB (e.g. channel deleted after rule creation)", async () => {
    mockRuleFindFirst.mockResolvedValue({
      id: "rule-005",
      name: "Orphaned Channel",
      notificationChannels: ["slack", "push"],
    });
    // Only slack exists, push channel was deleted
    mockChannelsFindMany.mockResolvedValue([
      { id: "ch-1", type: "slack", name: "Ops Slack", enabled: true, config: { webhookUrl: "https://hooks.slack.com/..." } },
    ]);
    mockSend.mockResolvedValue({ success: true });

    const { dispatchAlert } = await import("@/lib/notifications/dispatcher");
    const result = await dispatchAlert({
      id: "evt-005",
      ruleId: "rule-005",
      projectId: "proj-001",
      severity: "sev2",
      message: "Alert with missing channel",
    });

    // Only slack should be dispatched, push skipped
    expect(result.channels).toHaveLength(1);
    expect(result.channels[0].type).toBe("slack");
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("returns empty channels when rule is not found (defensive)", async () => {
    mockRuleFindFirst.mockResolvedValue(null);

    const { dispatchAlert } = await import("@/lib/notifications/dispatcher");
    const result = await dispatchAlert({
      id: "evt-006",
      ruleId: "nonexistent-rule",
      projectId: "proj-001",
      severity: "sev1",
      message: "No rule found",
    });

    // Rule not found -> notificationChannels defaults to [] -> empty
    expect(result.channels).toEqual([]);
    expect(mockSend).not.toHaveBeenCalled();
  });
});

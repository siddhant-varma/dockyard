/**
 * Test data factories for DockYard.
 *
 * Provides builder functions for creating test data objects
 * with sensible defaults that can be overridden per test.
 */

export function buildProject(overrides: Record<string, unknown> = {}) {
  return {
    id: "proj-001",
    name: "Test Project",
    slug: "test-project",
    description: "A test project",
    status: "active",
    techStack: ["typescript", "next.js"],
    localPath: "/tmp/test-project",
    githubRepo: null,
    dokployAppId: null,
    dokployType: null,
    discoveredVia: "filesystem",
    confidenceScore: 0.85,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-03-22"),
    ...overrides,
  };
}

export function buildAlertRule(overrides: Record<string, unknown> = {}) {
  return {
    id: "rule-001",
    projectId: "proj-001",
    name: "High CPU",
    metric: "cpu_percent",
    operator: ">",
    threshold: 90,
    durationSecs: 300,
    severity: "sev2" as const,
    notificationChannels: ["email", "slack"],
    enabled: true,
    cooldownSecs: 300,
    createdBy: "user-001",
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    ...overrides,
  };
}

export function buildAlertEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt-001",
    ruleId: "rule-001",
    projectId: "proj-001",
    severity: "sev2" as const,
    status: "firing" as const,
    message: "CPU usage above 90% for 5 minutes",
    context: { value: 95, threshold: 90 },
    triggeredAt: new Date("2026-03-22T10:00:00Z"),
    acknowledgedAt: null,
    acknowledgedBy: null,
    resolvedAt: null,
    resolvedBy: null,
    escalationLvl: 0,
    ...overrides,
  };
}

export function buildIncident(overrides: Record<string, unknown> = {}) {
  return {
    id: "inc-001",
    projectId: "proj-001",
    title: "Service degraded",
    severity: "sev2" as const,
    status: "investigating" as const,
    timeline: [],
    relatedAlerts: [],
    relatedDeploys: [],
    mttrSeconds: null,
    postmortem: null,
    createdAt: new Date("2026-03-22T10:00:00Z"),
    resolvedAt: null,
    ...overrides,
  };
}

export function buildSLO(overrides: Record<string, unknown> = {}) {
  return {
    id: "slo-001",
    projectId: "proj-001",
    metricName: "availability",
    targetValue: 99.9,
    windowDays: 30,
    currentValue: 99.85,
    budgetRemaining: 35.0,
    burnRate: 1.2,
    updatedAt: new Date("2026-03-22"),
    ...overrides,
  };
}

export function buildHealthResult(overrides: Record<string, unknown> = {}) {
  return {
    projectId: "proj-001",
    endpoint: "http://localhost:3001/healthz",
    status: "healthy" as const,
    statusCode: 200,
    latencyMs: 42,
    checkedAt: new Date("2026-03-22T10:00:00Z"),
    ...overrides,
  };
}

export function buildConfigEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "cfg-001",
    projectId: "proj-001",
    key: "DATABASE_URL",
    valueEncrypted: Buffer.from("encrypted-value"),
    environment: "production",
    isSecret: true,
    category: "Database",
    displayName: "Database URL",
    description: "PostgreSQL connection string",
    inputType: "text",
    inputOptions: null,
    updatedBy: "user-001",
    updatedAt: new Date("2026-03-22"),
    ...overrides,
  };
}

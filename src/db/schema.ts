/**
 * Drizzle ORM schema definitions for DockYard.
 *
 * Tables are organized by domain:
 * - Core: users, projects, discovery
 * - Watchtower: health checks, metrics, alerts, incidents
 * - Config: entries, audit log
 * - Integrations: deployments, billing, notifications
 *
 * See Roadmap.md §17 for full schema documentation.
 */

import {
  boolean,
  decimal,
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ================================================================
   Enums
   ================================================================ */

export const userRoleEnum = pgEnum("user_role", [
  "superadmin",
  "project_admin",
  "viewer",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "discovered",
  "discovery",
  "active",
  "paused",
  "completed",
  "archived",
]);

export const dokployTypeEnum = pgEnum("dokploy_type", [
  "application",
  "compose",
]);

export const healthStatusEnum = pgEnum("health_status", [
  "healthy",
  "degraded",
  "down",
  "maintenance",
  "unknown",
]);

export const componentStatusEnum = pgEnum("component_status", [
  "ok",
  "degraded",
  "down",
]);

export const severityEnum = pgEnum("severity", [
  "sev1",
  "sev2",
  "sev3",
  "sev4",
]);

export const alertStatusEnum = pgEnum("alert_status", [
  "firing",
  "acknowledged",
  "resolved",
  "auto_resolved",
]);

export const incidentStatusEnum = pgEnum("incident_status", [
  "investigating",
  "identified",
  "monitoring",
  "resolved",
  "postmortem",
]);

export const deployStatusEnum = pgEnum("deploy_status", [
  "pending",
  "building",
  "deploying",
  "success",
  "failed",
  "rolled_back",
]);

export const testTypeEnum = pgEnum("test_type", [
  "smoke",
  "integration",
  "load",
  "health_check",
  "custom",
]);

export const testStatusEnum = pgEnum("test_status", [
  "pending",
  "running",
  "passed",
  "failed",
  "error",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "email",
  "slack",
  "push",
  "webhook",
]);

export const discoverySourceTypeEnum = pgEnum("discovery_source_type", [
  "filesystem",
  "dokploy",
  "github",
  "manual",
]);

export const operatingModeEnum = pgEnum("operating_mode", ["local", "vps"]);

export const mfaTypeEnum = pgEnum("mfa_type", ["fido2", "totp"]);

export const projectMemberRoleEnum = pgEnum("project_member_role", [
  "admin",
  "viewer",
]);

/* ================================================================
   Core Tables
   ================================================================ */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  role: userRoleEnum("role").default("viewer").notNull(),
  authProvider: text("auth_provider"),
  authProviderId: text("auth_provider_id"),
  mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
  mfaMethod: text("mfa_method"),
  contextPrefs: jsonb("context_prefs"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** OAuth account links (Auth.js / NextAuth adapter table). */
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

/** Email verification tokens (Auth.js adapter table). */
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

/**
 * MFA credentials for FIDO2 (passkeys/security keys) and TOTP authenticator apps.
 * Credential data is encrypted at rest using AES-256-GCM.
 */
export const mfaCredentials = pgTable("mfa_credentials", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: mfaTypeEnum("type").notNull(),
  /** Encrypted JSON blob: FIDO2 stores credentialID + publicKey + counter; TOTP stores secret. */
  credentialData: text("credential_data").notNull(),
  /** User-provided friendly name (e.g., "YubiKey 5C", "Google Authenticator"). */
  name: text("name").notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  status: projectStatusEnum("status").default("discovered").notNull(),
  currentPhase: text("current_phase"),
  publicVisible: boolean("public_visible").default(false).notNull(),
  dokployAppId: text("dokploy_app_id"),
  dokployType: dokployTypeEnum("dokploy_type"),
  githubRepo: text("github_repo"),
  localPath: text("local_path"),
  techStack: text("tech_stack").array(),
  iconUrl: text("icon_url"),
  discoveredVia: text("discovered_via"),
  /**
   * Source of health monitoring data for this project.
   * - "internal": DockYard's built-in health poller (default)
   * - "kuma": Uptime Kuma external monitoring
   * - "both": Hybrid — uses both internal and Uptime Kuma monitors
   */
  monitoringSource: text("monitoring_source").default("internal").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Per-project role assignments for project-scoped access control.
 * A user can be an "admin" (manage config, deploy, alerts) or "viewer" (read-only)
 * for each project they are assigned to. Superadmin users bypass this entirely.
 */
export const projectMemberships = pgTable(
  "project_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    role: projectMemberRoleEnum("role").notNull(),
    grantedBy: uuid("granted_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique("uq_user_project").on(t.userId, t.projectId)]
);

export const discoverySources = pgTable("discovery_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: discoverySourceTypeEnum("type").notNull(),
  name: text("name").notNull(),
  config: jsonb("config").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  lastScanAt: timestamp("last_scan_at", { withTimezone: true }),
  lastScanResult: jsonb("last_scan_result"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const platformSettings = pgTable("platform_settings", {
  id: text("id").default("singleton").primaryKey(),
  operatingMode: operatingModeEnum("operating_mode").default("local").notNull(),
  autoScan: boolean("auto_scan").default(true).notNull(),
  scanInterval: integer("scan_interval").default(300).notNull(),
  settings: jsonb("settings"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ================================================================
   Project Content Tables
   ================================================================ */

export const roadmapItems = pgTable("roadmap_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("planned").notNull(),
  phase: text("phase"),
  estimatedAt: timestamp("estimated_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  sequenceOrder: integer("sequence_order"),
  blockers: jsonb("blockers"),
});

export const checkpoints = pgTable("checkpoints", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  type: text("type").default("manual").notNull(),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  snapshotDate: timestamp("snapshot_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const signalEvents = pgTable("signal_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  source: text("source").notNull(),
  eventType: text("event_type").notNull(),
  rawPayload: jsonb("raw_payload"),
  processed: boolean("processed").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const notes = pgTable("notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  content: text("content").notNull(),
  isPrivate: boolean("is_private").default(true).notNull(),
  authorId: uuid("author_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const aiContextSnapshots = pgTable("ai_context_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  payload: jsonb("payload").notNull(),
  format: text("format").default("json").notNull(),
  validationHash: text("validation_hash"),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ================================================================
   Watchtower Tables
   ================================================================ */

export const projectHealth = pgTable("project_health", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .unique()
    .notNull(),
  overallStatus: healthStatusEnum("overall_status")
    .default("unknown")
    .notNull(),
  components: jsonb("components"),
  uptime30d: decimal("uptime_30d", { precision: 5, scale: 2 }),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** TimescaleDB hypertable — created in migration via raw SQL */
export const healthCheckResults = pgTable("health_check_results", {
  id: uuid("id").defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  component: text("component").notNull(),
  status: componentStatusEnum("status").notNull(),
  latencyMs: integer("latency_ms"),
  responseCode: integer("response_code"),
  message: text("message"),
  checkedAt: timestamp("checked_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** TimescaleDB hypertable — created in migration via raw SQL */
export const metricPoints = pgTable("metric_points", {
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  metricName: text("metric_name").notNull(),
  metricValue: doublePrecision("metric_value").notNull(),
  labels: jsonb("labels"),
  recordedAt: timestamp("recorded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const alertRules = pgTable("alert_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id),
  name: text("name").notNull(),
  metric: text("metric").notNull(),
  operator: text("operator").notNull(),
  threshold: doublePrecision("threshold").notNull(),
  durationSecs: integer("duration_secs"),
  severity: severityEnum("severity").notNull(),
  runbookUrl: text("runbook_url"),
  notificationChannels: text("notification_channels").array(),
  enabled: boolean("enabled").default(true).notNull(),
  cooldownSecs: integer("cooldown_secs").default(300).notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const alertEvents = pgTable("alert_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  ruleId: uuid("rule_id")
    .references(() => alertRules.id)
    .notNull(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  severity: severityEnum("severity").notNull(),
  status: alertStatusEnum("status").default("firing").notNull(),
  message: text("message"),
  context: jsonb("context"),
  triggeredAt: timestamp("triggered_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  escalationLvl: integer("escalation_lvl").default(0).notNull(),
});

export const incidents = pgTable("incidents", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  title: text("title").notNull(),
  severity: severityEnum("severity").notNull(),
  status: incidentStatusEnum("status").default("investigating").notNull(),
  timeline: jsonb("timeline"),
  relatedAlerts: uuid("related_alerts").array(),
  relatedDeploys: uuid("related_deploys").array(),
  mttrSeconds: integer("mttr_seconds"),
  postmortem: text("postmortem"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

/**
 * Mapping between DockYard projects and Uptime Kuma monitors.
 *
 * Each row links a project to an external monitor in Uptime Kuma,
 * storing the monitor's type, URL, polling interval, and last-known status.
 * Auto-provisioned monitors are created by the discovery scanner;
 * manually-created monitors can also be linked here.
 */
export const kumaMonitors = pgTable("kuma_monitors", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  /** The numeric monitor ID assigned by Uptime Kuma. */
  kumaMonitorId: integer("kuma_monitor_id").notNull(),
  /** Monitor type: http, tcp, ping, docker, or keyword. */
  monitorType: text("monitor_type").notNull(),
  /** Human-readable name for the monitor (mirrors Kuma's friendly name). */
  name: text("name").notNull(),
  /** Target URL or address being monitored. */
  url: text("url").notNull(),
  /** Polling interval in seconds (Uptime Kuma default: 60). */
  interval: integer("interval").default(60).notNull(),
  /** Last-known status from Uptime Kuma: up, down, or pending. */
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ================================================================
   Config Management Tables
   ================================================================ */

export const configEntries = pgTable("config_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  key: text("key").notNull(),
  valueEncrypted: text("value_encrypted"),
  environment: text("environment").default("production").notNull(),
  isSecret: boolean("is_secret").default(false).notNull(),
  category: text("category"),
  displayName: text("display_name"),
  description: text("description"),
  inputType: text("input_type").default("text").notNull(),
  inputOptions: jsonb("input_options"),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const configAuditLog = pgTable("config_audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  configEntryId: uuid("config_entry_id")
    .references(() => configEntries.id)
    .notNull(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  oldValueHash: text("old_value_hash"),
  newValueHash: text("new_value_hash"),
  changedBy: uuid("changed_by").references(() => users.id),
  changedAt: timestamp("changed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  changeReason: text("change_reason"),
  rollbackOf: uuid("rollback_of"),
});

/**
 * Append-only audit log for all mutation operations.
 * Records actor, action, target, and before/after diff.
 * NEVER update or delete rows from this table.
 */
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => users.id),
  actorIp: text("actor_ip"),
  actorUserAgent: text("actor_user_agent"),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  diff: jsonb("diff"),
  timestamp: timestamp("timestamp", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Config templates for environment profiles (dev/staging/prod).
 * Each template stores a snapshot of config entries that can be applied
 * to bulk-update a project's configuration.
 */
export const configTemplates = pgTable("config_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  /** Array of {key, value, category} objects. */
  entries: jsonb("entries").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ================================================================
   Deployment & Integration Tables
   ================================================================ */

export const deploymentEvents = pgTable("deployment_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  version: text("version"),
  commitSha: text("commit_sha"),
  commitMessage: text("commit_message"),
  environment: text("environment").default("production").notNull(),
  status: deployStatusEnum("status").default("pending").notNull(),
  triggeredBy: text("triggered_by"),
  durationSecs: integer("duration_secs"),
  dokployDeployId: text("dokploy_deploy_id"),
  deployedAt: timestamp("deployed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const sloBudgets = pgTable("slo_budgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  metricName: text("metric_name").notNull(),
  targetValue: doublePrecision("target_value").notNull(),
  windowDays: integer("window_days").default(30).notNull(),
  currentValue: doublePrecision("current_value"),
  budgetRemaining: doublePrecision("budget_remaining"),
  burnRate: doublePrecision("burn_rate"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const testRuns = pgTable("test_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  type: testTypeEnum("type").notNull(),
  status: testStatusEnum("status").default("pending").notNull(),
  triggeredBy: uuid("triggered_by").references(() => users.id),
  triggerReason: text("trigger_reason"),
  results: jsonb("results"),
  durationSecs: integer("duration_secs"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const testConfigs = pgTable("test_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  type: testTypeEnum("type").notNull(),
  name: text("name").notNull(),
  config: jsonb("config"),
  scheduleCron: text("schedule_cron"),
  runPostDeploy: boolean("run_post_deploy").default(false).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** TimescaleDB hypertable — created in migration via raw SQL */
export const hetznerSnapshots = pgTable("hetzner_snapshots", {
  serverId: text("server_id").notNull(),
  metricType: text("metric_type").notNull(),
  value: doublePrecision("value").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const billingEstimates = pgTable("billing_estimates", {
  id: uuid("id").defaultRandom().primaryKey(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  serverCost: decimal("server_cost", { precision: 10, scale: 2 }),
  volumeCost: decimal("volume_cost", { precision: 10, scale: 2 }),
  ipCost: decimal("ip_cost", { precision: 10, scale: 2 }),
  lbCost: decimal("lb_cost", { precision: 10, scale: 2 }),
  trafficCost: decimal("traffic_cost", { precision: 10, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  currency: text("currency").default("EUR").notNull(),
  calculatedAt: timestamp("calculated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const notificationChannels = pgTable("notification_channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: notificationTypeEnum("type").notNull(),
  name: text("name").notNull(),
  config: jsonb("config").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ================================================================
   Relations
   ================================================================ */

export const usersRelations = relations(users, ({ many }) => ({
  mfaCredentials: many(mfaCredentials),
  projectMemberships: many(projectMemberships),
}));

export const projectMembershipsRelations = relations(
  projectMemberships,
  ({ one }) => ({
    user: one(users, {
      fields: [projectMemberships.userId],
      references: [users.id],
    }),
    project: one(projects, {
      fields: [projectMemberships.projectId],
      references: [projects.id],
    }),
  })
);

export const mfaCredentialsRelations = relations(mfaCredentials, ({ one }) => ({
  user: one(users, {
    fields: [mfaCredentials.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ many, one }) => ({
  roadmapItems: many(roadmapItems),
  checkpoints: many(checkpoints),
  signalEvents: many(signalEvents),
  notes: many(notes),
  health: one(projectHealth),
  configEntries: many(configEntries),
  deploymentEvents: many(deploymentEvents),
  alertRules: many(alertRules),
  incidents: many(incidents),
  testRuns: many(testRuns),
  testConfigs: many(testConfigs),
  memberships: many(projectMemberships),
  kumaMonitors: many(kumaMonitors),
}));

export const roadmapItemsRelations = relations(roadmapItems, ({ one }) => ({
  project: one(projects, {
    fields: [roadmapItems.projectId],
    references: [projects.id],
  }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  project: one(projects, {
    fields: [notes.projectId],
    references: [projects.id],
  }),
  author: one(users, { fields: [notes.authorId], references: [users.id] }),
}));

export const projectHealthRelations = relations(projectHealth, ({ one }) => ({
  project: one(projects, {
    fields: [projectHealth.projectId],
    references: [projects.id],
  }),
}));

export const alertRulesRelations = relations(alertRules, ({ one }) => ({
  project: one(projects, {
    fields: [alertRules.projectId],
    references: [projects.id],
  }),
}));

export const alertEventsRelations = relations(alertEvents, ({ one }) => ({
  rule: one(alertRules, {
    fields: [alertEvents.ruleId],
    references: [alertRules.id],
  }),
  project: one(projects, {
    fields: [alertEvents.projectId],
    references: [projects.id],
  }),
}));

export const kumaMonitorsRelations = relations(kumaMonitors, ({ one }) => ({
  project: one(projects, {
    fields: [kumaMonitors.projectId],
    references: [projects.id],
  }),
}));

/**
 * Development seed script.
 * Populates the database with realistic sample data for local development.
 *
 * Run: npx tsx src/db/seed.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  users,
  projects,
  platformSettings,
  discoverySources,
  roadmapItems,
  projectHealth,
  alertRules,
  notificationChannels,
} from "./schema";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://dockyard:dockyard@localhost:5433/dockyard";

async function seed() {
  const client = postgres(connectionString);
  const db = drizzle(client);

  console.warn("Seeding database...");

  // Clear existing data (in reverse FK order)
  await db.delete(alertRules);
  await db.delete(projectHealth);
  await db.delete(roadmapItems);
  await db.delete(notificationChannels);
  await db.delete(projects);
  await db.delete(discoverySources);
  await db.delete(platformSettings);
  await db.delete(users);

  // --- Users ---
  const [admin] = await db
    .insert(users)
    .values({
      email: "admin@example.com",
      name: "Admin",
      role: "superadmin",
      authProvider: "github",
    })
    .returning();

  // --- Platform Settings ---
  await db.insert(platformSettings).values({
    id: "singleton",
    operatingMode: "local",
    autoScan: true,
    scanInterval: 300,
    settings: {},
  });

  // --- Discovery Sources ---
  await db.insert(discoverySources).values([
    {
      type: "filesystem",
      name: "Local Projects",
      config: { path: "..", recursive: false },
      enabled: true,
    },
    {
      type: "github",
      name: "GitHub Org",
      config: { org: "your-org", token: "" },
      enabled: false,
    },
  ]);

  // --- Projects ---
  const [projectAlpha] = await db
    .insert(projects)
    .values({
      name: "Project Alpha",
      slug: "project-alpha",
      description: "Example web application with real-time features",
      status: "active",
      currentPhase: "Beta",
      publicVisible: true,
      githubRepo: "example-org/project-alpha",
      techStack: ["next.js", "typescript", "postgresql", "redis"],
      discoveredVia: "manual",
    })
    .returning();

  const [projectBeta] = await db
    .insert(projects)
    .values({
      name: "Project Beta",
      slug: "project-beta",
      description: "Centralized API gateway service",
      status: "active",
      currentPhase: "Production",
      publicVisible: false,
      githubRepo: "example-org/project-beta",
      techStack: ["go", "docker", "redis"],
      discoveredVia: "filesystem",
    })
    .returning();

  const [projectGamma] = await db
    .insert(projects)
    .values({
      name: "Project Gamma",
      slug: "project-gamma",
      description: "Marketing and portfolio site",
      status: "completed",
      currentPhase: "Maintenance",
      publicVisible: true,
      githubRepo: "example-org/project-gamma",
      techStack: ["astro", "tailwind"],
      discoveredVia: "github",
    })
    .returning();

  // --- Roadmap Items ---
  await db.insert(roadmapItems).values([
    {
      projectId: projectAlpha.id,
      title: "Real-time message reactions",
      status: "in_progress",
      phase: "Beta",
      sequenceOrder: 1,
    },
    {
      projectId: projectAlpha.id,
      title: "Typing indicators",
      status: "planned",
      phase: "Beta",
      sequenceOrder: 2,
    },
    {
      projectId: projectAlpha.id,
      title: "Push notifications",
      status: "planned",
      phase: "Beta",
      sequenceOrder: 3,
    },
    {
      projectId: projectBeta.id,
      title: "Rate limiting v2",
      status: "completed",
      phase: "Production",
      sequenceOrder: 1,
    },
    {
      projectId: projectBeta.id,
      title: "WebSocket proxy support",
      status: "in_progress",
      phase: "Production",
      sequenceOrder: 2,
    },
  ]);

  // --- Project Health ---
  await db.insert(projectHealth).values([
    {
      projectId: projectAlpha.id,
      overallStatus: "healthy",
      components: {
        api: { status: "ok", latency_ms: 120 },
        database: { status: "ok", latency_ms: 8 },
        redis: { status: "ok", latency_ms: 2 },
      },
      uptime30d: "99.7",
      lastCheckedAt: new Date(),
    },
    {
      projectId: projectBeta.id,
      overallStatus: "degraded",
      components: {
        api: { status: "ok", latency_ms: 45 },
        upstream: { status: "degraded", latency_ms: 1500 },
      },
      uptime30d: "99.2",
      lastCheckedAt: new Date(),
    },
    {
      projectId: projectGamma.id,
      overallStatus: "healthy",
      components: {
        cdn: { status: "ok", latency_ms: 15 },
      },
      uptime30d: "100.0",
      lastCheckedAt: new Date(),
    },
  ]);

  // --- Alert Rules ---
  await db.insert(alertRules).values([
    {
      projectId: projectAlpha.id,
      name: "Project Alpha Down",
      metric: "health_status",
      operator: "==",
      threshold: 0,
      durationSecs: 90,
      severity: "sev1",
      notificationChannels: ["email", "slack"],
      createdBy: admin.id,
    },
    {
      name: "High Error Rate (Global)",
      metric: "error_rate",
      operator: ">",
      threshold: 5.0,
      durationSecs: 300,
      severity: "sev2",
      notificationChannels: ["slack"],
      createdBy: admin.id,
    },
  ]);

  // --- Notification Channels ---
  await db.insert(notificationChannels).values([
    {
      type: "slack",
      name: "Ops Channel",
      config: { webhookUrl: "https://hooks.slack.com/services/example" },
      createdBy: admin.id,
    },
    {
      type: "email",
      name: "Admin Email",
      config: { email: "admin@example.com" },
      createdBy: admin.id,
    },
  ]);

  console.warn(
    "Seed complete: 1 user, 3 projects, 5 roadmap items, 3 health records, 2 alert rules, 2 notification channels"
  );

  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

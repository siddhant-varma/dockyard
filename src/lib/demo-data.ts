/**
 * Static demo data for running the frontend without a database.
 *
 * Activated by DOCKYARD_DEMO=true in .env.
 * Provides realistic sample data for every page so the UI can be
 * visually verified without any backend infrastructure.
 */

import type { ProjectSummary } from "@/components/projects/project-card";
import type { MetricSeries } from "@/components/dashboard/metrics-grid";
import type { PhaseEntry } from "@/components/projects/phase-timeline";
import type { ConfidenceFactors } from "@/components/projects/confidence-breakdown";
import type { Blocker } from "@/components/projects/blocker-list";
import type { ActivityEvent } from "@/components/projects/activity-feed";
import type { HealthSummary } from "@/components/watchtower/health-card";
import type { LogEntry } from "@/components/dashboard/logstream";
import type { AlertEvent, AlertRule } from "@/components/watchtower/alert-types";

export const DEMO_SERVER_STATUS = {
  id: "8821-4f9e-bc01-992a",
  name: "hetzner-cx31",
  status: "running" as const,
  publicIpv4: "167.235.1.92",
  serverType: "CX31",
  datacenter: "nbg1-dc3",
  uptime: "12d 4h 11m",
  osVersion: "Ubuntu 22.04 LTS",
};

export const DEMO_BILLING = {
  serverCost: "$5.83",
  volumeCost: "$2.40",
  totalCost: "$12.40",
  projectedCost: "$16.20",
  cycleEnd: "Apr 1",
  consumptionPct: 68,
};

export const DEMO_METRICS: MetricSeries[] = [
  {
    label: "CPU",
    currentValue: 23,
    unit: "%",
    history: [12, 18, 15, 22, 19, 25, 23, 20, 23],
    color: "#6366f1",
  },
  {
    label: "Memory",
    currentValue: 68,
    unit: "%",
    history: [65, 66, 67, 68, 67, 68, 68, 69, 68],
    color: "#22c55e",
  },
  {
    label: "Network In/Out",
    currentValue: 2.4,
    unit: "MB/s",
    history: [1.8, 2.1, 2.4, 1.9, 2.6, 2.4, 2.2, 2.5, 2.4],
    color: "#38bdf8",
  },
  {
    label: "Disk I/O",
    currentValue: 140,
    unit: "IOPS",
    history: [110, 125, 140, 130, 145, 135, 150, 140, 140],
    color: "#f59e0b",
  },
];

export const DEMO_PROJECTS: ProjectSummary[] = [
  {
    id: "1",
    name: "Aether Core",
    slug: "aether-core",
    description: "Next.js dashboard for internal ops with real-time monitoring",
    status: "active",
    currentPhase: "Phase 2",
    techStack: ["Next.js", "TypeScript", "PostgreSQL", "Tailwind"],
    updatedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    healthStatus: "healthy",
    confidenceScore: 0.984,
  },
  {
    id: "2",
    name: "Nebula Gateway",
    slug: "nebula-gateway",
    description: "Go API service with gRPC and Redis caching layer",
    status: "active",
    currentPhase: "Phase 1",
    techStack: ["Go", "gRPC", "PostgreSQL", "Redis"],
    updatedAt: new Date(Date.now() - 15 * 60_000).toISOString(),
    healthStatus: "degraded",
    confidenceScore: 0.721,
  },
  {
    id: "3",
    name: "Solaris DB",
    slug: "solaris-db",
    description: "TimescaleDB cluster management and automated backups",
    status: "active",
    currentPhase: "Phase 3",
    techStack: ["Rust", "PostgreSQL", "TimescaleDB"],
    updatedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    healthStatus: "healthy",
    confidenceScore: 0.999,
  },
  {
    id: "4",
    name: "Void Proxy",
    slug: "void-proxy",
    description: "Edge reverse proxy with automatic SSL provisioning",
    status: "active",
    currentPhase: "Phase 1",
    techStack: ["Go", "Caddy", "Docker"],
    updatedAt: new Date(Date.now() - 45 * 60_000).toISOString(),
    healthStatus: "down",
    confidenceScore: 0.142,
  },
  {
    id: "5",
    name: "Chronos Engine",
    slug: "chronos-engine",
    description: "Background job scheduler with retry logic and dead letter queues",
    status: "active",
    currentPhase: "Phase 2",
    techStack: ["TypeScript", "Inngest", "Redis"],
    updatedAt: new Date(Date.now() - 8 * 3600_000).toISOString(),
    healthStatus: "healthy",
    confidenceScore: 0.895,
  },
  {
    id: "6",
    name: "Prism UI",
    slug: "prism-ui",
    description: "Marketing site and documentation portal",
    status: "paused",
    currentPhase: null,
    techStack: ["Astro", "Tailwind"],
    updatedAt: new Date(Date.now() - 7 * 86400_000).toISOString(),
    healthStatus: "healthy",
    confidenceScore: 0.948,
  },
];

export const DEMO_ALERTS = [
  {
    id: "a1",
    severity: "sev1" as const,
    message: "API down — connection refused on port 8080",
    projectName: "Void Proxy",
    timeAgo: "3m ago",
  },
  {
    id: "a2",
    severity: "sev3" as const,
    message: "SLO burn rate 4.2x — availability budget at 12%",
    projectName: "Nebula Gateway",
    timeAgo: "18m ago",
  },
];

export const DEMO_LOGS: LogEntry[] = [
  { timestamp: "18:53:12", level: "warn", message: "Backup process for 'hetzner-cx31' retry 1/3" },
  { timestamp: "18:52:45", level: "info", message: "Health check passed — all components healthy" },
  { timestamp: "18:52:10", level: "info", message: "SSE broadcast: health_updated for 3 subscribers" },
  { timestamp: "18:51:30", level: "error", message: "Redis connection refused on port 6379" },
  { timestamp: "18:51:12", level: "info", message: "Deploy #142 succeeded — v1.2.3 live" },
  { timestamp: "18:50:45", level: "warn", message: "Memory usage 88% — approaching threshold (90%)" },
];

export const DEMO_BILLING_HISTORY = [
  { month: "Oct", cost: 11.2 },
  { month: "Nov", cost: 12.8 },
  { month: "Dec", cost: 14.1 },
  { month: "Jan", cost: 13.5 },
  { month: "Feb", cost: 14.7 },
  { month: "Mar", cost: 12.4, projected: true },
];

export const DEMO_TRAFFIC = {
  inboundGb: 45,
  outboundGb: 129,
  limitGb: 200,
  projectedOverageGb: 10,
};

/* ── Project Detail demo data ────────────────────────── */

export const DEMO_PHASES: PhaseEntry[] = [
  { name: "Phase 0", status: "achieved", completedCount: 32, itemCount: 32 },
  { name: "Phase 1", status: "achieved", completedCount: 73, itemCount: 73 },
  { name: "Phase 2", status: "current", completedCount: 75, itemCount: 106 },
  { name: "Phase 3", status: "planned", completedCount: 0, itemCount: 40 },
];

export const DEMO_CONFIDENCE: ConfidenceFactors = {
  velocity: 0.75,
  blockers: 0.10,
  recency: 0.05,
  health: 0,
  overall: 0.60,
  decaying: true,
};

export const DEMO_BLOCKERS: Blocker[] = [
  {
    id: "B-204",
    title: "Redis connection timeout under load",
    severity: "critical",
    owner: "@dev1",
    context: "Cache Layer",
  },
  {
    id: "B-205",
    title: "Flaky integration test in auth module",
    severity: "medium",
    owner: "@dev2",
    context: "Auth Module",
  },
];

export const DEMO_ACTIVITY: ActivityEvent[] = [
  { id: "e1", type: "push", summary: "3 commits pushed to main", timeAgo: "15m ago" },
  { id: "e2", type: "deploy", summary: "Deploy #142 succeeded", timeAgo: "1h ago" },
  { id: "e3", type: "config", summary: "DB_HOST changed", timeAgo: "2h ago" },
  { id: "e4", type: "alert", summary: "SLO burn rate resolved", timeAgo: "5h ago" },
  { id: "e5", type: "member", summary: "@dev3 joined as viewer", timeAgo: "1d ago" },
];

/* ── Watchtower demo data ────────────────────────────── */

export const DEMO_HEALTH_PROJECTS: HealthSummary[] = [
  {
    projectName: "Void Proxy",
    slug: "void-proxy",
    status: "down",
    uptime30d: 98.2,
    latencyMs: null,
    lastChecked: "30s ago",
    components: [
      { name: "API", status: "down" },
      { name: "DB", status: "healthy" },
      { name: "Redis", status: "down" },
    ],
  },
  {
    projectName: "Nebula Gateway",
    slug: "nebula-gateway",
    status: "degraded",
    uptime30d: 99.12,
    latencyMs: 245,
    lastChecked: "30s ago",
    components: [
      { name: "API", status: "healthy" },
      { name: "DB", status: "healthy" },
      { name: "Redis", status: "degraded" },
    ],
  },
  {
    projectName: "Aether Core",
    slug: "aether-core",
    status: "healthy",
    uptime30d: 99.94,
    latencyMs: 34,
    lastChecked: "30s ago",
    components: [
      { name: "API", status: "healthy" },
      { name: "DB", status: "healthy" },
      { name: "Redis", status: "healthy" },
    ],
  },
  {
    projectName: "Solaris DB",
    slug: "solaris-db",
    status: "healthy",
    uptime30d: 99.99,
    latencyMs: 8,
    lastChecked: "30s ago",
    components: [
      { name: "API", status: "healthy" },
      { name: "DB", status: "healthy" },
    ],
  },
  {
    projectName: "Chronos Engine",
    slug: "chronos-engine",
    status: "healthy",
    uptime30d: 99.87,
    latencyMs: 52,
    lastChecked: "30s ago",
    components: [
      { name: "API", status: "healthy" },
      { name: "Worker", status: "healthy" },
      { name: "Redis", status: "healthy" },
    ],
  },
  {
    projectName: "Prism UI",
    slug: "prism-ui",
    status: "healthy",
    uptime30d: 99.99,
    latencyMs: 12,
    lastChecked: "1m ago",
    components: [{ name: "CDN", status: "healthy" }],
  },
  {
    projectName: "DockYard",
    slug: "dockyard",
    status: "healthy",
    uptime30d: 99.99,
    latencyMs: 8,
    lastChecked: "30s ago",
    components: [
      { name: "API", status: "healthy" },
      { name: "DB", status: "healthy" },
      { name: "Inngest", status: "healthy" },
    ],
  },
  {
    projectName: "Payments",
    slug: "payments",
    status: "healthy",
    uptime30d: 99.95,
    latencyMs: 67,
    lastChecked: "30s ago",
    components: [
      { name: "API", status: "healthy" },
      { name: "Stripe", status: "healthy" },
    ],
  },
];

/* ── Alerts demo data ────────────────────────────────── */

export const DEMO_ALERT_EVENTS: AlertEvent[] = [
  {
    id: "alert-1",
    severity: "sev1",
    title: "CPU > 90% for 5m",
    source: "Core-API-Cluster",
    firingFor: "2h 15m",
    status: "firing",
  },
  {
    id: "alert-2",
    severity: "sev2",
    title: "Memory Usage Spike > 85%",
    source: "Database-Prod",
    firingFor: "45m",
    status: "firing",
  },
  {
    id: "alert-3",
    severity: "sev3",
    title: "API Latency P99 > 400ms",
    source: "Gateway-v2",
    firingFor: "12m",
    status: "acknowledged",
  },
];

export const DEMO_ALERT_RULES: AlertRule[] = [
  { id: "r1", name: "CPU Critical", metric: "cpu_percent", threshold: "> 90%", window: "5m", projects: "ALL", enabled: true },
  { id: "r2", name: "Memory High", metric: "mem_percent", threshold: "> 85%", window: "10m", projects: "ALL", enabled: true },
  { id: "r3", name: "Disk Full Impending", metric: "fs_usage_percent", threshold: "> 85%", window: "10m", projects: "ALL", enabled: true },
  { id: "r4", name: "Inbound Traffic Peak", metric: "network_in_mbps", threshold: "> 500", window: "1m", projects: "EDGE-PROXY", enabled: true },
  { id: "r5", name: "Legacy Auth Failures", metric: "auth_error_total", threshold: "> 10", window: "5m", projects: "V1-LEGACY", enabled: false },
  { id: "r6", name: "Queue Length Delay", metric: "jobs_pending_count", threshold: "> 5000", window: "15m", projects: "WORKERS", enabled: true },
  { id: "r7", name: "Database Connections", metric: "db_connections_active", threshold: "> 800", window: "2m", projects: "SQL-MAIN", enabled: true },
];

/* ── Incidents demo data ─────────────────────────────── */

export interface DemoIncident {
  id: string;
  title: string;
  severity: "sev1" | "sev2" | "sev3";
  status: "open" | "investigating" | "mitigated" | "resolved";
  service: string;
  commander: string;
  startedAt: string;
  duration: string;
}

export interface DemoTimelineEntry {
  time: string;
  icon: "warning" | "search" | "comment" | "deploy" | "check";
  text: string;
}

export const DEMO_INCIDENTS: DemoIncident[] = [
  {
    id: "inc-001",
    title: "Database connection pool exhaustion",
    severity: "sev1",
    status: "investigating",
    service: "Project Alpha",
    commander: "Elena R.",
    startedAt: "Mar 20, 14:30",
    duration: "4h 23m",
  },
  {
    id: "inc-002",
    title: "Intermittent latency on Auth Cluster-B",
    severity: "sev2",
    status: "investigating",
    service: "Auth Service",
    commander: "Alex K.",
    startedAt: "Mar 20, 16:15",
    duration: "2h 38m",
  },
  {
    id: "inc-003",
    title: "Redis cache eviction rate spike",
    severity: "sev2",
    status: "resolved",
    service: "Nebula Gateway",
    commander: "Sam T.",
    startedAt: "Mar 20, 17:41",
    duration: "1h 12m",
  },
  {
    id: "inc-004",
    title: "Global Edge CDN propagation failure",
    severity: "sev1",
    status: "resolved",
    service: "Prism UI",
    commander: "Jordan M.",
    startedAt: "Mar 19, 22:00",
    duration: "6h 45m",
  },
  {
    id: "inc-005",
    title: "S3 Bucket permission drift detected",
    severity: "sev3",
    status: "open",
    service: "Solaris DB",
    commander: "—",
    startedAt: "Mar 21, 09:30",
    duration: "12m",
  },
  {
    id: "inc-006",
    title: "Slow response times on Payment Gateway",
    severity: "sev2",
    status: "investigating",
    service: "Payments",
    commander: "Dana L.",
    startedAt: "Mar 21, 08:49",
    duration: "53m",
  },
];

export const DEMO_INCIDENT_TIMELINE: DemoTimelineEntry[] = [
  { time: "Mar 20, 14:30", icon: "warning", text: "Incident created by alert rule `DB_CONN_POOL > 90%`" },
  { time: "Mar 20, 14:45", icon: "search", text: "Status changed to Investigating by @dev1" },
  { time: "Mar 20, 15:12", icon: "comment", text: "Connection pool scaled from 20 → 50 connections" },
  { time: "Mar 20, 16:05", icon: "deploy", text: "Deploy #142 triggered (rollback) by System Guardian" },
  { time: "Mar 20, 18:53", icon: "check", text: "Status changed to Mitigated — monitoring" },
];

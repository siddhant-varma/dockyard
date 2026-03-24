/**
 * Kuma monitor auto-provisioning service.
 *
 * Automatically creates Uptime Kuma monitors for discovered projects
 * based on their DIP (DockYard Integration Protocol) level and health
 * endpoints. Stores monitor-to-project mappings in the `kuma_monitors`
 * database table.
 *
 * @module kuma/provisioner
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { kumaMonitors } from "@/db/schema";
import type { CreateMonitorInput, KumaMonitor } from "./types";
import { createKumaMonitor } from "./api";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("kuma.provisioner");

/** Monitor type identifiers used in provisioning decisions. */
export type MonitorType = "http" | "keyword" | "json-query";

/** Result of provisioning monitors for a single project. */
export interface ProvisionResult {
  projectId: string;
  created: number;
  monitors: Array<{
    kumaMonitorId: number;
    type: MonitorType;
    url: string;
    name: string;
  }>;
  errors: string[];
}

/**
 * Determine which monitor types to create based on DIP level.
 *
 * - Level 0: Basic HTTP ping
 * - Level 1: HTTP + keyword check (verifies response body)
 * - Level 2+: HTTP + keyword + custom metrics endpoint
 *
 * @param dipLevel - The project's DIP integration level (0-4)
 * @returns Array of monitor types to provision
 */
export function determineMonitorTypes(dipLevel: number): MonitorType[] {
  if (dipLevel <= 0) return ["http"];
  if (dipLevel === 1) return ["http", "keyword"];
  return ["http", "keyword", "json-query"];
}

/**
 * Build monitor creation inputs for a project based on its DIP level.
 */
function buildMonitorInputs(
  projectSlug: string,
  healthEndpoint: string,
  monitorTypes: MonitorType[]
): CreateMonitorInput[] {
  const inputs: CreateMonitorInput[] = [];

  for (const monitorType of monitorTypes) {
    switch (monitorType) {
      case "http":
        inputs.push({
          name: `${projectSlug} — HTTP`,
          type: "http",
          url: healthEndpoint,
          interval: 60,
          maxretries: 3,
          accepted_statuscodes: ["200-299"],
          description: `Auto-provisioned HTTP monitor for ${projectSlug}`,
          method: "GET",
        });
        break;

      case "keyword":
        inputs.push({
          name: `${projectSlug} — Keyword`,
          type: "keyword",
          url: healthEndpoint,
          interval: 60,
          maxretries: 2,
          accepted_statuscodes: ["200-299"],
          keyword: '"status":"ok"',
          description: `Auto-provisioned keyword monitor for ${projectSlug}`,
          method: "GET",
        });
        break;

      case "json-query":
        inputs.push({
          name: `${projectSlug} — Metrics`,
          type: "json-query",
          url: healthEndpoint.replace(/\/healthz?\/?$/, "/metrics"),
          interval: 120,
          maxretries: 2,
          accepted_statuscodes: ["200-299"],
          description: `Auto-provisioned metrics monitor for ${projectSlug}`,
          method: "GET",
        });
        break;
    }
  }

  return inputs;
}

/**
 * Store a monitor-to-project mapping in the `kuma_monitors` table.
 */
async function storeMonitorMapping(
  projectId: string,
  monitor: KumaMonitor,
  monitorType: MonitorType
): Promise<void> {
  await db.insert(kumaMonitors).values({
    projectId,
    kumaMonitorId: monitor.id,
    monitorType,
    name: monitor.name,
    url: monitor.url,
    interval: monitor.interval,
    status: "pending",
  });

  log.info(
    { projectId, kumaMonitorId: monitor.id, type: monitorType },
    "Monitor-to-project mapping stored"
  );
}

/**
 * Provision Uptime Kuma monitors for a discovered project.
 *
 * Creates monitors in Kuma based on DIP level and health endpoint.
 * Each created monitor is recorded in `kuma_monitors` to maintain
 * the mapping. Returns early if Kuma is not configured.
 *
 * @param projectId - DockYard project UUID
 * @param projectSlug - URL-safe slug for naming monitors
 * @param healthEndpoint - Health check URL (optional, resolved if not given)
 * @param dipLevel - DIP integration level (default: 0)
 */
export async function provisionProjectMonitors(
  projectId: string,
  projectSlug: string,
  healthEndpoint?: string,
  dipLevel: number = 0
): Promise<ProvisionResult> {
  const result: ProvisionResult = {
    projectId,
    created: 0,
    monitors: [],
    errors: [],
  };

  if (!process.env.KUMA_URL) {
    log.debug("Kuma not configured — skipping provisioning");
    return result;
  }

  // Skip if monitors already exist
  const existing = await db.query.kumaMonitors.findMany({
    where: eq(kumaMonitors.projectId, projectId),
  });
  if (existing.length > 0) {
    log.info({ projectId, existingCount: existing.length }, "Monitors exist");
    return result;
  }

  // Resolve health endpoint
  const endpoint = healthEndpoint ?? (await resolveHealthEndpoint(projectId));
  if (!endpoint) {
    result.errors.push("No health endpoint available");
    return result;
  }

  const monitorTypes = determineMonitorTypes(dipLevel);
  const inputs = buildMonitorInputs(projectSlug, endpoint, monitorTypes);

  log.info(
    { projectId, projectSlug, monitorTypes, endpoint },
    "Provisioning Kuma monitors"
  );

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const monitorType = monitorTypes[i];

    const monitor = await createKumaMonitor(input);
    if (!monitor) {
      result.errors.push(`Failed to create ${monitorType} monitor`);
      continue;
    }

    await storeMonitorMapping(projectId, monitor, monitorType);

    result.monitors.push({
      kumaMonitorId: monitor.id,
      type: monitorType,
      url: input.url,
      name: input.name,
    });
    result.created++;
  }

  log.info(
    { projectId, created: result.created, errors: result.errors.length },
    "Kuma monitor provisioning complete"
  );

  return result;
}

/** Resolve a project's health endpoint from config. */
async function resolveHealthEndpoint(
  projectId: string
): Promise<string | null> {
  try {
    const { getHealthEndpoint } = await import("@/lib/health/config");
    const endpoint = await getHealthEndpoint(projectId);
    return endpoint?.healthUrl ?? null;
  } catch {
    log.debug({ projectId }, "Could not resolve health endpoint");
    return null;
  }
}

/**
 * Get all Kuma monitors associated with a project.
 *
 * @param projectId - DockYard project UUID
 * @returns Array of monitor records from the kuma_monitors table
 */
export async function getProjectMonitors(projectId: string) {
  return db.query.kumaMonitors.findMany({
    where: eq(kumaMonitors.projectId, projectId),
  });
}

/**
 * Check if a project already has Kuma monitors provisioned.
 *
 * @param projectId - DockYard project UUID
 * @returns true if at least one monitor exists
 */
export async function hasMonitors(projectId: string): Promise<boolean> {
  const existing = await db.query.kumaMonitors.findFirst({
    where: eq(kumaMonitors.projectId, projectId),
  });
  return existing !== undefined;
}

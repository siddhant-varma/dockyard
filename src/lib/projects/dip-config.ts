/**
 * DIP (DockYard Integration Protocol) level configuration service.
 *
 * Manages per-project DIP level settings stored in the config_entries table.
 * The DIP level determines which integration features are enabled:
 *
 * - Level 0: Basic discovery only (no endpoints required)
 * - Level 1: Health checks (/healthz, /readyz)
 * - Level 2: Prometheus metrics (/metrics)
 * - Level 3: Bidirectional events via CloudEvents
 * - Level 4: Full config management through DockYard API
 *
 * Each level is cumulative — Level 3 includes Levels 1 and 2.
 *
 * @see DOCKYARD-JSON.md for the DIP specification
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { configEntries } from "@/db/schema";
import type { DipLevel } from "@/lib/ingestion/versioning";

/** DIP configuration keys stored in config_entries. */
const DIP_LEVEL_KEY = "dip.level";
const DIP_HEALTH_URL_KEY = "dip.health_url";
const DIP_METRICS_URL_KEY = "dip.metrics_url";
const DIP_EVENTS_URL_KEY = "dip.events_url";
const DIP_WEBHOOK_SECRET_KEY = "dip.webhook_secret";

/** Configuration options for each DIP level. */
export interface DipConfig {
  /** Override URL for health checks (default: auto-detected). */
  healthUrl?: string;
  /** Override URL for Prometheus metrics (default: auto-detected). */
  metricsUrl?: string;
  /** URL to send CloudEvents to the project (Level 3+). */
  eventsUrl?: string;
  /** Shared secret for webhook signature verification. */
  webhookSecret?: string;
}

/** Full DIP status for a project. */
export interface DipStatus {
  /** Current DIP level (0-4). */
  level: DipLevel;
  /** DIP-specific configuration values. */
  config: DipConfig;
}

/**
 * Get the current DIP level for a project.
 *
 * Reads the `dip.level` config entry from the project's configuration.
 * Returns 0 if no DIP level has been configured.
 *
 * @param projectId - UUID of the project
 * @returns Current DIP level (0-4)
 */
export async function getDipLevel(projectId: string): Promise<DipLevel> {
  const entry = await db.query.configEntries.findFirst({
    where: and(
      eq(configEntries.projectId, projectId),
      eq(configEntries.key, DIP_LEVEL_KEY)
    ),
  });

  if (!entry?.valueEncrypted) return 0;

  const level = parseInt(entry.valueEncrypted, 10);
  if (level >= 0 && level <= 4) return level as DipLevel;
  return 0;
}

/**
 * Get the full DIP status (level + config) for a project.
 *
 * @param projectId - UUID of the project
 * @returns DIP level and configuration
 */
export async function getDipStatus(projectId: string): Promise<DipStatus> {
  const entries = await db
    .select()
    .from(configEntries)
    .where(
      and(
        eq(configEntries.projectId, projectId),
        eq(configEntries.category, "dip")
      )
    );

  const entryMap = new Map(entries.map((e) => [e.key, e.valueEncrypted]));

  const levelRaw = entryMap.get(DIP_LEVEL_KEY);
  const level = levelRaw ? parseInt(levelRaw, 10) : 0;
  const validLevel = level >= 0 && level <= 4 ? (level as DipLevel) : 0;

  return {
    level: validLevel,
    config: {
      healthUrl: entryMap.get(DIP_HEALTH_URL_KEY) ?? undefined,
      metricsUrl: entryMap.get(DIP_METRICS_URL_KEY) ?? undefined,
      eventsUrl: entryMap.get(DIP_EVENTS_URL_KEY) ?? undefined,
      webhookSecret: entryMap.get(DIP_WEBHOOK_SECRET_KEY) ?? undefined,
    },
  };
}

/**
 * Configure the DIP level and associated settings for a project.
 *
 * Sets the DIP level and upserts the optional URL/secret configuration
 * entries. Lower levels clear higher-level config keys to avoid stale data.
 *
 * @param projectId - UUID of the project
 * @param level - DIP level to set (0-4)
 * @param config - Optional URL and secret overrides
 */
export async function configureDip(
  projectId: string,
  level: DipLevel,
  config?: DipConfig
): Promise<void> {
  // Upsert the DIP level
  await upsertConfigEntry(projectId, DIP_LEVEL_KEY, String(level));

  // Upsert or clear config entries based on level
  if (level >= 1 && config?.healthUrl) {
    await upsertConfigEntry(projectId, DIP_HEALTH_URL_KEY, config.healthUrl);
  } else if (level < 1) {
    await clearConfigEntry(projectId, DIP_HEALTH_URL_KEY);
  }

  if (level >= 2 && config?.metricsUrl) {
    await upsertConfigEntry(projectId, DIP_METRICS_URL_KEY, config.metricsUrl);
  } else if (level < 2) {
    await clearConfigEntry(projectId, DIP_METRICS_URL_KEY);
  }

  if (level >= 3) {
    if (config?.eventsUrl) {
      await upsertConfigEntry(projectId, DIP_EVENTS_URL_KEY, config.eventsUrl);
    }
    if (config?.webhookSecret) {
      await upsertConfigEntry(
        projectId,
        DIP_WEBHOOK_SECRET_KEY,
        config.webhookSecret
      );
    }
  } else {
    await clearConfigEntry(projectId, DIP_EVENTS_URL_KEY);
    await clearConfigEntry(projectId, DIP_WEBHOOK_SECRET_KEY);
  }
}

/**
 * Insert or update a DIP config entry for a project.
 */
async function upsertConfigEntry(
  projectId: string,
  key: string,
  value: string
): Promise<void> {
  const existing = await db.query.configEntries.findFirst({
    where: and(
      eq(configEntries.projectId, projectId),
      eq(configEntries.key, key)
    ),
  });

  if (existing) {
    await db
      .update(configEntries)
      .set({ valueEncrypted: value, updatedAt: new Date() })
      .where(eq(configEntries.id, existing.id));
  } else {
    await db.insert(configEntries).values({
      projectId,
      key,
      valueEncrypted: value,
      category: "dip",
      displayName: key.replace("dip.", "DIP ").replace(/_/g, " "),
      isSecret: key === DIP_WEBHOOK_SECRET_KEY,
    });
  }
}

/**
 * Remove a DIP config entry for a project.
 */
async function clearConfigEntry(
  projectId: string,
  key: string
): Promise<void> {
  const existing = await db.query.configEntries.findFirst({
    where: and(
      eq(configEntries.projectId, projectId),
      eq(configEntries.key, key)
    ),
  });

  if (existing) {
    await db
      .update(configEntries)
      .set({ valueEncrypted: null, updatedAt: new Date() })
      .where(eq(configEntries.id, existing.id));
  }
}

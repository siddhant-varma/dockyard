/**
 * Dokploy discovery source.
 *
 * Discovers projects by querying the Dokploy API for all deployed
 * applications and compose services. Each Dokploy app maps to a
 * DockYard project.
 *
 * Configuration (from discovery_sources.config JSONB):
 *   { instanceUrl: string, apiKey: string }
 */

import type { DiscoveredProject, DiscoverySource } from "../types";
import { generateSlug } from "../indicators";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("discovery.dokploy");

interface DokployApp {
  applicationId?: string;
  composeId?: string;
  appName?: string;
  name?: string;
  description?: string;
}

export class DokploySource implements DiscoverySource {
  readonly type = "dokploy" as const;

  async scan(config: Record<string, unknown>): Promise<DiscoveredProject[]> {
    const instanceUrl = String(config.instanceUrl ?? "");
    const apiKey = String(config.apiKey ?? "");

    if (!instanceUrl || !apiKey) {
      log.warn(
        { hasInstanceUrl: !!instanceUrl, hasApiKey: !!apiKey },
        "Missing instanceUrl or apiKey — skipping Dokploy discovery"
      );
      return [];
    }

    const baseUrl = instanceUrl.replace(/\/$/, "");
    log.info({ baseUrl }, "Dokploy scan starting");
    const discovered: DiscoveredProject[] = [];

    const applications = await this.fetchApps(baseUrl, apiKey, "application");
    const composeServices = await this.fetchApps(baseUrl, apiKey, "compose");

    log.info(
      { applications: applications.length, composeServices: composeServices.length },
      "Dokploy API responses received"
    );

    for (const app of applications) {
      const name = app.appName ?? app.name ?? "unknown";
      discovered.push({
        name,
        slug: generateSlug(name),
        description: app.description,
        dokployAppId: app.applicationId,
        dokployType: "application",
        source: "dokploy",
      });
    }

    for (const svc of composeServices) {
      const name = svc.name ?? "unknown";
      discovered.push({
        name,
        slug: generateSlug(name),
        description: svc.description,
        dokployAppId: svc.composeId,
        dokployType: "compose",
        source: "dokploy",
      });
    }

    return discovered;
  }

  private async fetchApps(
    baseUrl: string,
    apiKey: string,
    type: "application" | "compose"
  ): Promise<DokployApp[]> {
    const endpoint =
      type === "application"
        ? `${baseUrl}/api/application.all`
        : `${baseUrl}/api/compose.all`;

    try {
      log.debug({ endpoint, type }, "Fetching from Dokploy API");

      const response = await fetch(endpoint, {
        headers: { "x-api-key": apiKey },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        log.error(
          { endpoint, status: response.status, statusText: response.statusText },
          "Dokploy API returned error"
        );
        return [];
      }

      const data = await response.json();
      const apps = Array.isArray(data) ? data : [];
      log.debug({ endpoint, count: apps.length }, "Dokploy API responded");
      return apps;
    } catch (err) {
      log.error(
        { endpoint, err },
        "Dokploy API request failed — check instance URL and connectivity"
      );
      return [];
    }
  }
}

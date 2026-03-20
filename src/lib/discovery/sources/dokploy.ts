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
      return [];
    }

    const baseUrl = instanceUrl.replace(/\/$/, "");
    const discovered: DiscoveredProject[] = [];

    const applications = await this.fetchApps(baseUrl, apiKey, "application");
    const composeServices = await this.fetchApps(baseUrl, apiKey, "compose");

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
    try {
      const endpoint =
        type === "application"
          ? `${baseUrl}/api/application.all`
          : `${baseUrl}/api/compose.all`;

      const response = await fetch(endpoint, {
        headers: { "x-api-key": apiKey },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) return [];

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
}

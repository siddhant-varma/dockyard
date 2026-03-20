/**
 * Dokploy API client — implements DeployProvider interface.
 *
 * Wraps the Dokploy REST API for managing applications, environment variables,
 * deployments, and logs. All calls go through this client, never directly
 * from frontend or API routes.
 *
 * Auth: JWT token via `x-api-key` header.
 * Gotchas:
 * - saveEnvironment requires the FULL env string, not individual key-value pairs
 * - Redeploy after env change is a SEPARATE API call
 *
 * @see https://docs.dokploy.com/docs/api
 */

import type {
  ApplicationDetail,
  ApplicationSummary,
  DeployProvider,
  DeployResult,
  LogEntry,
  LogOptions,
  MetricDataPoint,
  MetricSeries,
  TimeRange,
} from "../providers/types";
import { fetchJSON } from "../http/client";

/* ================================================================
   Dokploy API Response Types (partial — fields we use)
   ================================================================ */

interface DokployApplication {
  applicationId: string;
  appName: string;
  description?: string;
  applicationStatus: string;
  repository?: string;
  branch?: string;
  dockerImage?: string;
  domains?: Array<{ host: string }>;
  env?: string;
  memoryLimit?: number;
  cpuLimit?: number;
  createdAt: string;
}

interface DokployCompose {
  composeId: string;
  name: string;
  description?: string;
  composeStatus: string;
  createdAt: string;
}

interface DokployLogEntry {
  message: string;
  timestamp?: string;
}

interface DokployMetricPoint {
  cpu: number;
  memory: { percentage: number };
  timestamp: string;
}

export class DokployClient implements DeployProvider {
  readonly name = "dokploy";

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string
  ) {}

  private get authHeaders(): Record<string, string> {
    return { "x-api-key": this.apiKey };
  }

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/$/, "")}${path}`;
  }

  async listApplications(): Promise<ApplicationSummary[]> {
    const [apps, composeServices] = await Promise.all([
      this.fetchApps(),
      this.fetchComposeServices(),
    ]);

    const appSummaries: ApplicationSummary[] = apps.map((app) => ({
      id: app.applicationId,
      name: app.appName,
      type: "application" as const,
      status: mapDokployStatus(app.applicationStatus),
      createdAt: new Date(app.createdAt),
    }));

    const composeSummaries: ApplicationSummary[] = composeServices.map(
      (svc) => ({
        id: svc.composeId,
        name: svc.name,
        type: "compose" as const,
        status: mapDokployStatus(svc.composeStatus),
        createdAt: new Date(svc.createdAt),
      })
    );

    return [...appSummaries, ...composeSummaries];
  }

  async getApplication(id: string): Promise<ApplicationDetail> {
    // Try as application first, fall back to compose
    try {
      const app = await fetchJSON<DokployApplication>(
        this.url(`/application.one?applicationId=${id}`),
        { headers: this.authHeaders }
      );
      return mapApplicationDetail(app);
    } catch {
      const compose = await fetchJSON<DokployCompose>(
        this.url(`/compose.one?composeId=${id}`),
        { headers: this.authHeaders }
      );
      return mapComposeDetail(compose);
    }
  }

  async deploy(id: string): Promise<DeployResult> {
    return this.triggerDeploy(id, "deploy");
  }

  async redeploy(id: string): Promise<DeployResult> {
    return this.triggerDeploy(id, "redeploy");
  }

  async start(id: string): Promise<void> {
    await this.postAction(id, "start");
  }

  async stop(id: string): Promise<void> {
    await this.postAction(id, "stop");
  }

  async getEnvironment(id: string): Promise<string> {
    const app = await fetchJSON<DokployApplication>(
      this.url(`/application.one?applicationId=${id}`),
      { headers: this.authHeaders }
    );
    return app.env ?? "";
  }

  /**
   * Replace the full environment variable string for an application.
   * IMPORTANT: Dokploy requires the FULL env string, not individual updates.
   * After saving, you must call `redeploy()` separately.
   */
  async saveEnvironment(id: string, env: string): Promise<void> {
    await fetchJSON<unknown>(this.url("/application.saveEnvironment"), {
      method: "POST",
      headers: this.authHeaders,
      body: { applicationId: id, env, buildArgs: "" },
    });
  }

  async getLogs(id: string, options?: LogOptions): Promise<LogEntry[]> {
    const params = new URLSearchParams({ applicationId: id });
    if (options?.tail) params.set("tail", String(options.tail));

    const data = await fetchJSON<DokployLogEntry[] | string>(
      this.url(`/application.readLogs?${params}`),
      { headers: this.authHeaders }
    );

    return parseLogs(data);
  }

  async getMetrics(id: string, _range: TimeRange): Promise<MetricSeries[]> {
    const data = await fetchJSON<DokployMetricPoint[]>(
      this.url(`/application.readAppMonitoring?applicationId=${id}`),
      { headers: this.authHeaders }
    );

    if (!Array.isArray(data) || data.length === 0) return [];

    const cpuPoints: MetricDataPoint[] = [];
    const memoryPoints: MetricDataPoint[] = [];

    for (const point of data) {
      const ts = new Date(point.timestamp);
      cpuPoints.push({ timestamp: ts, value: point.cpu });
      memoryPoints.push({
        timestamp: ts,
        value: point.memory.percentage,
      });
    }

    return [
      { name: "cpu", labels: { unit: "percent" }, dataPoints: cpuPoints },
      {
        name: "memory",
        labels: { unit: "percent" },
        dataPoints: memoryPoints,
      },
    ];
  }

  /* ================================================================
     Private helpers
     ================================================================ */

  private async fetchApps(): Promise<DokployApplication[]> {
    try {
      const data = await fetchJSON<DokployApplication[]>(
        this.url("/application.all"),
        { headers: this.authHeaders }
      );
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  private async fetchComposeServices(): Promise<DokployCompose[]> {
    try {
      const data = await fetchJSON<DokployCompose[]>(this.url("/compose.all"), {
        headers: this.authHeaders,
      });
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  private async triggerDeploy(
    id: string,
    action: "deploy" | "redeploy"
  ): Promise<DeployResult> {
    // Try application endpoint first, then compose
    try {
      await fetchJSON<unknown>(this.url(`/application.${action}`), {
        method: "POST",
        headers: this.authHeaders,
        body: { applicationId: id },
      });
    } catch {
      await fetchJSON<unknown>(this.url(`/compose.${action}`), {
        method: "POST",
        headers: this.authHeaders,
        body: { composeId: id },
      });
    }

    return {
      deployId: `${action}-${id}-${Date.now()}`,
      status: "queued",
    };
  }

  private async postAction(
    id: string,
    action: "start" | "stop"
  ): Promise<void> {
    try {
      await fetchJSON<unknown>(this.url(`/application.${action}`), {
        method: "POST",
        headers: this.authHeaders,
        body: { applicationId: id },
      });
    } catch {
      await fetchJSON<unknown>(this.url(`/compose.${action}`), {
        method: "POST",
        headers: this.authHeaders,
        body: { composeId: id },
      });
    }
  }
}

/* ================================================================
   Mapping Helpers
   ================================================================ */

function mapDokployStatus(status: string): ApplicationSummary["status"] {
  const map: Record<string, ApplicationSummary["status"]> = {
    done: "running",
    running: "running",
    idle: "stopped",
    error: "error",
    building: "building",
  };
  return map[status] ?? "unknown";
}

function mapApplicationDetail(app: DokployApplication): ApplicationDetail {
  return {
    id: app.applicationId,
    name: app.appName,
    type: "application",
    status: mapDokployStatus(app.applicationStatus),
    createdAt: new Date(app.createdAt),
    description: app.description,
    repository: app.repository,
    branch: app.branch,
    dockerImage: app.dockerImage,
    domains: app.domains?.map((d) => d.host) ?? [],
    env: app.env ?? "",
    memoryLimit: app.memoryLimit,
    cpuLimit: app.cpuLimit,
  };
}

function mapComposeDetail(compose: DokployCompose): ApplicationDetail {
  return {
    id: compose.composeId,
    name: compose.name,
    type: "compose",
    status: mapDokployStatus(compose.composeStatus),
    createdAt: new Date(compose.createdAt),
    description: compose.description,
    domains: [],
    env: "",
  };
}

/**
 * Parse Dokploy log output into structured LogEntry objects.
 * Dokploy may return an array of objects or a raw string.
 */
function parseLogs(data: DokployLogEntry[] | string): LogEntry[] {
  if (typeof data === "string") {
    return data
      .split("\n")
      .filter(Boolean)
      .map((line) => ({
        timestamp: new Date(),
        message: line,
        level: inferLogLevel(line),
      }));
  }

  if (!Array.isArray(data)) return [];

  return data.map((entry) => ({
    timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
    message: entry.message,
    level: inferLogLevel(entry.message),
  }));
}

function inferLogLevel(message: string): LogEntry["level"] {
  const lower = message.toLowerCase();
  if (lower.includes("error") || lower.includes("fatal")) return "error";
  if (lower.includes("warn")) return "warn";
  if (lower.includes("debug")) return "debug";
  return "info";
}

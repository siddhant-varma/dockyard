/**
 * Health check poller service.
 *
 * Polls a project's /healthz endpoint (DIP Level 1) and returns
 * a structured result. Handles timeouts, non-200 responses, and
 * malformed JSON gracefully.
 *
 * DIP Level 1 expected response:
 * {
 *   "status": "ok" | "degraded" | "down",
 *   "version": "1.2.3",
 *   "uptime_seconds": 86400,
 *   "checks": {
 *     "database": { "status": "ok", "latency_ms": 12 },
 *     "cache": { "status": "ok", "latency_ms": 3 }
 *   }
 * }
 */

import { createModuleLogger } from "@/lib/logger";
const log = createModuleLogger("health.poller");

/** Component-level health check from the /healthz response. */
export interface ComponentCheck {
  name: string;
  status: "ok" | "degraded" | "down";
  latencyMs?: number;
  message?: string;
}

/** Result of polling a single project's health endpoint. */
export interface HealthPollResult {
  projectId: string;
  overallStatus: "ok" | "degraded" | "down";
  responseCode: number;
  latencyMs: number;
  components: ComponentCheck[];
  version?: string;
  uptimeSeconds?: number;
  error?: string;
  checkedAt: Date;
}

/** Timeout for health check requests (5 seconds). */
const HEALTH_TIMEOUT_MS = 5000;

/**
 * Poll a project's health endpoint and return the result.
 *
 * @param projectId - UUID of the project (for tagging the result)
 * @param healthUrl - Full URL to the /healthz endpoint
 * @returns Structured health poll result
 */
export async function pollHealth(
  projectId: string,
  healthUrl: string
): Promise<HealthPollResult> {
  const checkedAt = new Date();
  const startTime = performance.now();

  try {
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      log.info(
        { projectId, responseCode: response.status, latencyMs },
        "Health poll returned non-OK — marking down"
      );
      return {
        projectId,
        overallStatus: "down",
        responseCode: response.status,
        latencyMs,
        components: [],
        error: `HTTP ${response.status} ${response.statusText}`,
        checkedAt,
      };
    }

    const body = await response.json().catch(() => null);
    const result = parseHealthResponse(
      projectId,
      body,
      response.status,
      latencyMs,
      checkedAt
    );

    log.debug(
      { projectId, status: result.overallStatus, latencyMs, components: result.components.length },
      "Health poll completed"
    );

    return result;
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startTime);
    const message = err instanceof Error ? err.message : String(err);
    const errorMsg = message.includes("abort") ? "Timeout (5s)" : message;

    log.info(
      { projectId, error: errorMsg, latencyMs },
      "Health poll failed — marking down"
    );

    return {
      projectId,
      overallStatus: "down",
      responseCode: 0,
      latencyMs,
      components: [],
      error: errorMsg,
      checkedAt,
    };
  }
}

/**
 * Poll the /readyz endpoint to check if a project is ready to serve traffic.
 * Simpler than /healthz — just returns true/false.
 */
export async function pollReady(readyUrl: string): Promise<boolean> {
  try {
    const response = await fetch(readyUrl, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    if (!response.ok) return false;
    const body = await response.json().catch(() => null);
    if (body && typeof body === "object" && "ready" in body) {
      return Boolean(body.ready);
    }
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Parse a DIP Level 1 /healthz response body into a structured result.
 */
function parseHealthResponse(
  projectId: string,
  body: unknown,
  responseCode: number,
  latencyMs: number,
  checkedAt: Date
): HealthPollResult {
  if (!body || typeof body !== "object") {
    return {
      projectId,
      overallStatus: responseCode === 200 ? "ok" : "down",
      responseCode,
      latencyMs,
      components: [],
      checkedAt,
    };
  }

  const data = body as Record<string, unknown>;

  const overallStatus = parseStatus(data.status);
  const components = parseComponents(data.checks);

  return {
    projectId,
    overallStatus,
    responseCode,
    latencyMs,
    components,
    version: typeof data.version === "string" ? data.version : undefined,
    uptimeSeconds:
      typeof data.uptime_seconds === "number" ? data.uptime_seconds : undefined,
    checkedAt,
  };
}

function parseStatus(status: unknown): "ok" | "degraded" | "down" {
  if (status === "ok" || status === "healthy") return "ok";
  if (status === "degraded") return "degraded";
  if (status === "down" || status === "unhealthy") return "down";
  return "ok";
}

function parseComponents(checks: unknown): ComponentCheck[] {
  if (!checks || typeof checks !== "object") return [];

  const components: ComponentCheck[] = [];
  for (const [name, check] of Object.entries(
    checks as Record<string, unknown>
  )) {
    if (!check || typeof check !== "object") continue;
    const c = check as Record<string, unknown>;
    components.push({
      name,
      status: parseStatus(c.status),
      latencyMs: typeof c.latency_ms === "number" ? c.latency_ms : undefined,
      message: typeof c.message === "string" ? c.message : undefined,
    });
  }
  return components;
}

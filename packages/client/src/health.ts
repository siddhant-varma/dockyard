/**
 * Health middleware for DockYard DIP Level 1.
 *
 * Creates /healthz and /readyz handlers that aggregate component checks
 * into a DIP-compliant health response.
 *
 * @example
 * ```ts
 * import { healthMiddleware } from "@dockyard/client";
 *
 * const health = healthMiddleware({
 *   checks: {
 *     database: async () => ({ status: "ok", latency_ms: 5 }),
 *     redis: async () => ({ status: "ok", latency_ms: 2 }),
 *   },
 * });
 * ```
 */

/** Result of a single health check. */
export interface HealthCheckResult {
  status: "ok" | "degraded" | "down";
  latency_ms?: number;
  message?: string;
}

/** Health check function. */
export type HealthCheck = () => Promise<HealthCheckResult>;

/** Configuration for the health middleware. */
export interface HealthMiddlewareConfig {
  checks: Record<string, HealthCheck>;
  readyChecks?: Record<string, HealthCheck>;
}

/** DIP Level 1 health response. */
export interface HealthResponse {
  status: "healthy" | "degraded" | "down";
  components: Record<string, HealthCheckResult>;
  timestamp: string;
}

/**
 * Create health check handlers for /healthz and /readyz.
 *
 * @param config - Health check configuration
 * @returns Object with healthz() and readyz() handler functions
 */
export function healthMiddleware(config: HealthMiddlewareConfig) {
  async function runChecks(
    checks: Record<string, HealthCheck>
  ): Promise<HealthResponse> {
    const components: Record<string, HealthCheckResult> = {};
    let overall: HealthResponse["status"] = "healthy";

    for (const [name, check] of Object.entries(checks)) {
      try {
        const start = Date.now();
        const result = await check();
        if (!result.latency_ms) result.latency_ms = Date.now() - start;
        components[name] = result;

        if (result.status === "down") overall = "down";
        else if (result.status === "degraded" && overall !== "down")
          overall = "degraded";
      } catch (err) {
        components[name] = {
          status: "down",
          message: err instanceof Error ? err.message : "Check failed",
        };
        overall = "down";
      }
    }

    return { status: overall, components, timestamp: new Date().toISOString() };
  }

  return {
    async healthz(): Promise<{
      status: number;
      headers: Record<string, string>;
      body: HealthResponse;
    }> {
      const response = await runChecks(config.checks);
      return {
        status: response.status === "down" ? 503 : 200,
        headers: { "Content-Type": "application/json" },
        body: response,
      };
    },

    async readyz(): Promise<{
      status: number;
      headers: Record<string, string>;
      body: HealthResponse;
    }> {
      const checks = { ...config.checks, ...(config.readyChecks ?? {}) };
      const response = await runChecks(checks);
      return {
        status: response.status === "down" ? 503 : 200,
        headers: { "Content-Type": "application/json" },
        body: response,
      };
    },
  };
}

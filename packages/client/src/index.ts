/**
 * @dockyard/client — Lightweight SDK for integrating with DockYard.
 *
 * @example
 * ```ts
 * import { DockYard } from "@dockyard/client";
 *
 * const dy = new DockYard({
 *   projectId: "my-project",
 *   endpoint: "https://dockyard.cc",
 *   webhookSecret: process.env.DOCKYARD_WEBHOOK_SECRET!,
 * });
 *
 * // DIP Level 1: Health
 * const health = dy.health({ checks: { db: checkDb } });
 *
 * // DIP Level 2: Metrics
 * const metrics = dy.metrics();
 *
 * // DIP Level 3: Events
 * await dy.emit("deployment.completed", { version: "1.2.3" });
 * ```
 */

import { healthMiddleware } from "./health";
import { metricsMiddleware } from "./metrics";
import { createEmitter } from "./emit";

export { healthMiddleware, type HealthCheckResult, type HealthResponse, type HealthMiddlewareConfig } from "./health";
export { metricsMiddleware, type MetricsRegistry } from "./metrics";
export { createEmitter, type DockYardEventType, type EmitConfig } from "./emit";

/** Configuration for the DockYard client. */
export interface DockYardConfig {
  projectId: string;
  endpoint: string;
  webhookSecret?: string;
}

/**
 * Main DockYard client class.
 *
 * Provides convenience methods for all DIP levels.
 */
export class DockYard {
  private config: DockYardConfig;

  constructor(config: DockYardConfig) {
    this.config = config;
  }

  /** Create health middleware (DIP Level 1). */
  health(options: { checks: Record<string, () => Promise<import("./health").HealthCheckResult>> }) {
    return healthMiddleware(options);
  }

  /** Create metrics middleware (DIP Level 2). */
  metrics() {
    return metricsMiddleware();
  }

  /** Emit a CloudEvent (DIP Level 3). */
  async emit(type: import("./emit").DockYardEventType, data: Record<string, unknown>) {
    if (!this.config.webhookSecret) {
      throw new Error("webhookSecret is required for event emission (DIP Level 3)");
    }
    const emitter = createEmitter({
      endpoint: this.config.endpoint,
      projectId: this.config.projectId,
      webhookSecret: this.config.webhookSecret,
    });
    return emitter.emit(type, data);
  }
}

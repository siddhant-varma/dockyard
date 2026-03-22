/**
 * Inngest logging middleware for DockYard background jobs.
 *
 * Creates a child Pino logger per function run with:
 * - functionName: which Inngest function is executing
 * - event name and run context
 *
 * Logs function start/end and captures errors.
 *
 * @example
 * ```ts
 * // In inngest/client.ts:
 * import { PinoLoggerMiddleware } from "@/lib/logger/inngest";
 * export const inngest = new Inngest({
 *   id: "dockyard",
 *   middleware: [PinoLoggerMiddleware],
 * });
 * ```
 */

import { Middleware } from "inngest";
import { rootLogger } from "./index";
import type pino from "pino";

/**
 * Inngest middleware class that logs function lifecycle events via Pino.
 */
export class PinoLoggerMiddleware extends Middleware.BaseMiddleware {
  readonly id = "pino-logger";
  private child: pino.Logger = rootLogger;
  private startTime = 0;

  override onRunStart({ ctx, fn }: Middleware.OnRunStartArgs) {
    const functionName = fn?.id ?? "unknown";
    const eventName = ctx?.event?.name ?? "unknown";

    this.child = rootLogger.child({
      source: "inngest",
      module: `inngest.${functionName}`,
      functionName,
      eventName,
    });

    this.startTime = performance.now();
    this.child.info("Inngest function started");
  }

  override onRunComplete() {
    const duration = Math.round(performance.now() - this.startTime);
    this.child.info({ duration }, "Inngest function completed");
  }

  override onRunError({ error }: Middleware.OnRunErrorArgs) {
    const duration = Math.round(performance.now() - this.startTime);
    this.child.error(
      { err: error, duration },
      "Inngest function failed"
    );
  }
}

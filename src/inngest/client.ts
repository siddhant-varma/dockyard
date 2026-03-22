import { Inngest } from "inngest";
import { PinoLoggerMiddleware } from "@/lib/logger/inngest";

/**
 * Shared Inngest client for DockYard.
 *
 * All background job definitions (health checks, alert evaluation,
 * project scanning, AI summaries, etc.) import this client to
 * define their functions.
 *
 * Includes Pino logging middleware that automatically creates
 * a child logger per function run with functionName, runId, and eventName.
 *
 * @see https://www.inngest.com/docs/reference/client/create
 */
export const inngest = new Inngest({
  id: "dockyard",
  middleware: [PinoLoggerMiddleware],
});

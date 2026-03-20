import { Inngest } from "inngest";

/**
 * Shared Inngest client for DockYard.
 *
 * All background job definitions (health checks, alert evaluation,
 * project scanning, AI summaries, etc.) import this client to
 * define their functions.
 *
 * @see https://www.inngest.com/docs/reference/client/create
 */
export const inngest = new Inngest({
  id: "dockyard",
});

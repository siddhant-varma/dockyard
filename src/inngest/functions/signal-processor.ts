/**
 * Signal event processor worker.
 *
 * Event-driven: fires when a new signal event is received.
 * Loads unprocessed events and routes them to handlers.
 */

import { inngest } from "../client";
import { processSignalEvent } from "@/lib/ingestion/processor";
import { db } from "@/db/connection";
import { signalEvents } from "@/db/schema";
import { eq } from "drizzle-orm";

export const signalProcessor = inngest.createFunction(
  {
    id: "signal-processor",
    name: "Signal Event Processor",
    triggers: [{ event: "dockyard/signal.received" }],
  },
  async ({ event, step }) => {
    const eventId = event.data.eventId as string | undefined;

    if (eventId) {
      // Process a specific event
      const result = await step.run("process-event", async () => {
        return processSignalEvent(eventId);
      });
      return result;
    }

    // Batch: process all unprocessed events
    const unprocessed = await step.run("load-unprocessed", async () => {
      return db.query.signalEvents.findMany({
        where: eq(signalEvents.processed, false),
        limit: 50,
        orderBy: (e, { asc }) => [asc(e.createdAt)],
      });
    });

    const results = await step.run("process-batch", async () => {
      const processed = [];
      for (const event of unprocessed) {
        const result = await processSignalEvent(event.id);
        processed.push(result);
      }
      return processed;
    });

    return {
      total: results.length,
      processed: results.filter((r) => r.processed).length,
      failed: results.filter((r) => !r.processed).length,
    };
  }
);

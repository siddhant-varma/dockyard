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
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("inngest.signal-processor");

export const signalProcessor = inngest.createFunction(
  {
    id: "signal-processor",
    name: "Signal Event Processor",
    triggers: [{ event: "dockyard/signal.received" }],
  },
  async ({ event, step }) => {
    const eventId = event.data.eventId as string | undefined;

    if (eventId) {
      log.info({ eventId }, "Processing single signal event");
      const singleResult = await step.run("process-event", async () => {
        return processSignalEvent(eventId);
      });
      log.info({ eventId, processed: singleResult.processed }, "Signal event processed");
      return singleResult;
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
      for (const evt of unprocessed) {
        const result = await processSignalEvent(evt.id);
        processed.push(result);
      }
      return processed;
    });

    const processedCount = results.filter((r: { processed: boolean }) => r.processed).length;
    const failedCount = results.filter((r: { processed: boolean }) => !r.processed).length;
    log.info(
      { total: results.length, processed: processedCount, failed: failedCount },
      "Signal batch processing complete"
    );

    return {
      total: results.length,
      processed: processedCount,
      failed: failedCount,
    };
  }
);

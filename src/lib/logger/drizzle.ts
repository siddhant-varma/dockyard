/**
 * Custom Drizzle ORM query logger for DockYard.
 *
 * Implements Drizzle's Logger interface to log SQL queries with:
 * - Query text (truncated to 500 chars to prevent log bloat)
 * - Parameter count (never the values — they may contain secrets)
 * - Request context from AsyncLocalStorage (requestId, userId)
 *
 * @example
 * ```ts
 * import { queryLogger } from "@/lib/logger/drizzle";
 * export const db = drizzle(client, { schema, logger: queryLogger });
 * ```
 */

import type { Logger } from "drizzle-orm";
import { getLogger } from "./index";

/**
 * Drizzle query logger that writes to Pino at debug level.
 * Automatically inherits request context via AsyncLocalStorage.
 */
export const queryLogger: Logger = {
  logQuery(query: string, params: unknown[]) {
    const log = getLogger();
    log.debug(
      {
        module: "db",
        query: query.length > 500 ? query.slice(0, 500) + "..." : query,
        paramCount: params.length,
      },
      "Database query"
    );
  },
};

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { queryLogger } from "@/lib/logger/drizzle";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("db");

/**
 * PostgreSQL connection string from environment variables.
 * Falls back to the local Docker Compose default for development.
 */
const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://dockyard:dockyard@localhost:5433/dockyard";

/**
 * Raw postgres.js connection — used by Drizzle and for raw queries if needed.
 * Connection pool is managed by postgres.js internally.
 */
let client: ReturnType<typeof postgres>;
try {
  client = postgres(connectionString);
  log.info("Database connection initialized");
} catch (err) {
  log.fatal({ err }, "Failed to create database connection");
  throw err;
}

/**
 * Drizzle ORM instance with full schema awareness and query logging.
 * Import this in service-layer code to run typed queries.
 *
 * @example
 * ```ts
 * import { db } from "@/db/connection";
 * const projects = await db.query.projects.findMany();
 * ```
 */
export const db = drizzle(client, { schema, logger: queryLogger });

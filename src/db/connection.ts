import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

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
const client = postgres(connectionString);

/**
 * Drizzle ORM instance with full schema awareness.
 * Import this in service-layer code to run typed queries.
 *
 * @example
 * ```ts
 * import { db } from "@/db/connection";
 * const projects = await db.query.projects.findMany();
 * ```
 */
export const db = drizzle(client, { schema });

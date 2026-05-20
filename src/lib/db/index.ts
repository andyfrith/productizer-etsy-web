import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | null = null;
let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Returns a singleton Drizzle client. Throws if DATABASE_URL is unset.
 */
export function getDb() {
  if (!database) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set");
    }
    client = postgres(url, { max: 1 });
    database = drizzle(client, { schema });
  }
  return database;
}

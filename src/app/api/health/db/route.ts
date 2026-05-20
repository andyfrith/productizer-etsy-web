import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

/**
 * Database connectivity probe — SELECT 1 against Postgres.
 */
export async function GET() {
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "Database unavailable" });
  }
}

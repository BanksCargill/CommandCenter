import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/db/schema";
import path from "path";

const dbPath = path.join(process.cwd(), "db", "command-center.db");
const sqlite = new Database(dbPath);

sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

// Skip during `next build` — migrations run at server startup in production
if (process.env.NEXT_PHASE !== "phase-production-build") {
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
}

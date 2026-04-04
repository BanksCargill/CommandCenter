import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "db", "command-center.db");
const db = new Database(dbPath);
db.pragma("wal_checkpoint(TRUNCATE)");
db.close();
console.log("WAL checkpointed.");

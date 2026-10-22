// Internal database adapter. Application code must use ./index instead.
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema";

export function openDatabase(path: string) {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const sqlite = new Database(path);
  try {
    sqlite.pragma("busy_timeout = 5000");
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    const db = drizzle(sqlite, { schema });
    // Resolve from the app root, not from a compiled .next server chunk.
    migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });
    return { sqlite, db };
  } catch (error) {
    sqlite.close();
    throw error;
  }
}

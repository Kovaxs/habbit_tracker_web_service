import "server-only";
import { getDatabasePath } from "@/lib/config";
import { openDatabase } from "./connection";

const globalForDb = globalThis as typeof globalThis & {
  habitTrackerDb?: ReturnType<typeof openDatabase>;
};

/** Open one connection per process, only when a server feature needs it. */
export function getDb() {
  globalForDb.habitTrackerDb ??= openDatabase(getDatabasePath());
  return globalForDb.habitTrackerDb.db;
}

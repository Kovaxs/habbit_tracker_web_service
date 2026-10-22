import { resolve } from "node:path";

/** Server and CLI configuration. Do not import this module in client components. */
export function getDatabasePath(env: Record<string, string | undefined> = process.env): string {
  const value = env.DATABASE_PATH ?? "./data/habit-tracker.sqlite";
  if (!value.trim()) {
    throw new Error("DATABASE_PATH must not be empty.");
  }
  return resolve(value);
}

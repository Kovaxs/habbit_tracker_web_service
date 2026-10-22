import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { getDatabasePath } from "./src/lib/config";

// Match `next dev` by default. Set NODE_ENV=production for a deployed database.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
const databasePath = getDatabasePath();
mkdirSync(dirname(databasePath), { recursive: true });

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: databasePath },
});

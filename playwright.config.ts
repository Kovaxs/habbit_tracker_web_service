import { defineConfig, devices } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = mkdtempSync(join(tmpdir(), "habit-tracker-e2e-"));
process.env.HABIT_E2E_DIRECTORY = directory;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  reporter: "list",
  globalTeardown: "./tests/e2e/teardown.ts",
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 } } },
    { name: "webkit", use: { ...devices["iPhone 13 Mini"] } },
  ],
  webServer: {
    command: "npm start -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 60000,
    env: { DATABASE_PATH: join(directory, "test.sqlite") },
  },
});

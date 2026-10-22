import { rmSync } from "node:fs";
import { basename } from "node:path";

export default function teardown() {
  const path = process.env.HABIT_E2E_DIRECTORY;
  if (path && basename(path).startsWith("habit-tracker-e2e-")) rmSync(path, { recursive: true, force: true });
}

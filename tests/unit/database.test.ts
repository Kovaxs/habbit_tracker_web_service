import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { openDatabase } from "@/server/db/connection";

it("creates the data directory and enables database safeguards", () => {
  const directory = mkdtempSync(join(tmpdir(), "habit-tracker-"));
  try {
    const { sqlite, db } = openDatabase(join(directory, "nested", "test.sqlite"));
    try {
      expect(db).toBeDefined();
      expect(sqlite.pragma("journal_mode", { simple: true })).toBe("wal");
      expect(sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
      expect(sqlite.pragma("busy_timeout", { simple: true })).toBe(5000);
    } finally {
      sqlite.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

import Database from "better-sqlite3";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { openDatabase } from "@/server/db/connection";
import { createRepository } from "@/server/repository";

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

it("migrates existing habits, records and notes into the Personal profile", () => {
  const directory = mkdtempSync(join(tmpdir(), "habit-tracker-migration-"));
  const path = join(directory, "legacy.sqlite");
  const legacy = new Database(path);
  try {
    legacy.pragma("foreign_keys = ON");
    legacy.exec(readFileSync(join(process.cwd(), "drizzle/0000_demonic_ted_forrester.sql"), "utf8"));
    legacy.exec("CREATE TABLE __drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)");
    const journal = JSON.parse(readFileSync(join(process.cwd(), "drizzle/meta/_journal.json"), "utf8")) as { entries: { when: number }[] };
    legacy.prepare("INSERT INTO __drizzle_migrations (id, hash, created_at) VALUES (1, 'initial', ?)").run(journal.entries[0].when);
    legacy.prepare("INSERT INTO habits (id, name, kind, tracking, direction, target, unit, start_date, start_hour, end_hour, review_hour, archived, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run("legacy-habit", "Legacy synthetic habit", "count", "daily", "increase", 1, "times", "2024-01-01", 0, 24, 14, 0, "2024-01-01T00:00:00.000Z");
    legacy.prepare("INSERT INTO entries (habit_id, date, slot, value) VALUES ('legacy-habit', '2024-01-01', -1, 0)").run();
    legacy.prepare("INSERT INTO notes (date, helped, difficult) VALUES ('2024-01-01', 'Legacy synthetic note', '')").run();
  } finally {
    legacy.close();
  }

  try {
    const { sqlite, db } = openDatabase(path);
    try {
      const snapshot = createRepository(db, "default").getSnapshot();
      expect(snapshot.habits).toEqual([expect.objectContaining({ id: "legacy-habit", profileId: "default", name: "Legacy synthetic habit" })]);
      expect(snapshot.entries).toEqual([{ habitId: "legacy-habit", date: "2024-01-01", slot: -1, value: 0 }]);
      expect(snapshot.notes).toEqual([{ profileId: "default", date: "2024-01-01", helped: "Legacy synthetic note", difficult: "" }]);
      expect(sqlite.pragma("foreign_key_check")).toEqual([]);
    } finally {
      sqlite.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

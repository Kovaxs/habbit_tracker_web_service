import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { HabitInput } from "@/lib/types";
import type { ParsedWorkbook } from "@/features/imports/workbook";
import { openDatabase } from "@/server/db/connection";
import { createRepository } from "@/server/repository";

const input: HabitInput = { name: "Synthetic habit", kind: "count", tracking: "hourly", direction: "decrease", target: 0, unit: "times", startDate: "2024-12-30", startHour: 0, endHour: 24, reviewHour: 14 };
function workbook(): ParsedWorkbook {
  return { habits: [input], entries: [{ habitName: input.name, date: "2024-12-30", slot: 0, value: 0 }, { habitName: input.name, date: "2025-01-05", slot: 23, value: 4 }], notes: [{ date: "2024-12-30", helped: "Synthetic note", difficult: "" }], preview: { habits: [input.name], sheets: 1, entries: 2, zeroes: 1, notes: 1, from: "2024-12-30", to: "2025-01-05", warnings: [] } };
}
let connection: ReturnType<typeof openDatabase>;
let repository: ReturnType<typeof createRepository>;
beforeEach(() => { connection = openDatabase(":memory:"); repository = createRepository(connection.db); });
afterEach(() => connection.sqlite.close());

describe("repository", () => {
  it("starts empty, preserves zero, upserts records and deletes only explicit null", () => {
    expect(repository.getSnapshot()).toEqual({ habits: [], entries: [], notes: [] });
    const { id: habitId } = repository.createHabit(input).habits[0];
    const record = { habitId, date: "2024-12-30", slot: 14, value: 0 };
    expect(repository.saveEntry(record).entries).toEqual([record]);
    expect(repository.saveEntry({ ...record, value: 4 }).entries).toEqual([{ ...record, value: 4 }]);
    expect(repository.saveEntry({ ...record, value: null }).entries).toEqual([]);
    expect(() => repository.saveEntry({ ...record, value: undefined })).toThrow();
    expect(() => repository.saveEntry({ ...record, habitId: "missing" })).toThrow();
  });
  it("validates mutation input, duplicates and record-dependent edits", () => {
    const { id } = repository.createHabit(input).habits[0];
    expect(() => repository.createHabit(input)).toThrow("already exists");
    expect(() => repository.setArchived(id, "false")).toThrow();
    expect(repository.setArchived(id, true).habits[0].archived).toBe(true);
    repository.saveEntry({ habitId: id, date: "2024-12-31", slot: 0, value: 0 });
    expect(() => repository.updateHabit(id, { ...input, tracking: "daily" })).toThrow();
    expect(() => repository.updateHabit(id, { ...input, startDate: "2025-01-01" })).toThrow();
    expect(repository.updateHabit(id, { ...input, startDate: "2024-12-31", reviewHour: 12 }).habits[0].reviewHour).toBe(12);
  });
  it("upserts and clears notes; validates dates and lengths", () => {
    const note = { date: "2024-12-30", helped: "Synthetic help", difficult: "Synthetic obstacle" };
    expect(repository.saveNote(note).notes).toEqual([note]);
    expect(repository.saveNote({ ...note, helped: "Changed" }).notes).toHaveLength(1);
    expect(repository.saveNote({ ...note, helped: "", difficult: "" }).notes).toEqual([]);
    expect(() => repository.saveNote({ ...note, difficult: "a".repeat(4001) })).toThrow();
  });
  it("preview writes nothing and reimport is idempotent", () => {
    expect(repository.previewWorkbook(workbook()).entries).toBe(2);
    expect(repository.getSnapshot().habits).toHaveLength(0);
    const first = repository.importWorkbook(workbook());
    expect(first.summary).toEqual({ habitsAdded: 1, entriesAdded: 2, entriesSkipped: 0, notesAdded: 1 });
    const second = repository.importWorkbook(workbook());
    expect(second.summary).toEqual({ habitsAdded: 0, entriesAdded: 0, entriesSkipped: 2, notesAdded: 0 });
    expect(second.snapshot).toEqual(first.snapshot);
  });
  it("keeps existing values and notes and warns about conflicts", () => {
    const first = repository.importWorkbook(workbook());
    repository.saveEntry({ ...first.snapshot.entries[0], value: 5 });
    repository.saveNote({ date: "2024-12-30", helped: "Keep this", difficult: "Also keep this" });
    const preview = repository.previewWorkbook(workbook());
    expect(preview.warnings.join(" ")).toContain("1 with different values");
    expect(preview.warnings.join(" ")).toContain("existing notes");
    const result = repository.importWorkbook(workbook());
    expect(result.snapshot.entries[0].value).toBe(5);
    expect(result.snapshot.notes[0].helped).toBe("Keep this");
  });
  it("rejects incompatible existing habits without any writes", () => {
    repository.createHabit({ ...input, tracking: "daily" });
    const before = repository.getSnapshot();
    expect(repository.previewWorkbook(workbook()).warnings.join(" ")).toContain("incompatible");
    expect(() => repository.importWorkbook(workbook())).toThrow("incompatible");
    expect(repository.getSnapshot()).toEqual(before);
  });
  it("extends a compatible habit earlier without overwriting user settings", () => {
    repository.createHabit({ ...input, startDate: "2025-01-01", target: 2, reviewHour: 12 });
    const { snapshot, summary } = repository.importWorkbook(workbook());
    expect(summary.habitsAdded).toBe(0);
    expect(snapshot.habits[0]).toMatchObject({ startDate: "2024-12-30", target: 2, reviewHour: 12 });
  });
  it("rolls back habits, records and notes on late invalid input", () => {
    const bad = workbook();
    bad.entries.push({ ...bad.entries[0], slot: 24 });
    expect(() => repository.importWorkbook(bad)).toThrow();
    expect(repository.getSnapshot()).toEqual({ habits: [], entries: [], notes: [] });
    const badNote = workbook();
    badNote.notes.push({ date: "2025-01-01", helped: "x".repeat(4001), difficult: "" });
    expect(() => repository.importWorkbook(badNote)).toThrow();
    expect(repository.getSnapshot()).toEqual({ habits: [], entries: [], notes: [] });
  });
  it("rolls back conflicting duplicate records and rejects unknown habits", () => {
    const duplicate = workbook();
    duplicate.entries.push({ ...duplicate.entries[0], value: 6 });
    expect(() => repository.importWorkbook(duplicate)).toThrow("different values");
    expect(repository.getSnapshot().habits).toHaveLength(0);
    const unknown = workbook();
    unknown.entries[0].habitName = "Unknown";
    expect(() => repository.importWorkbook(unknown)).toThrow("unknown habit");
  });
  it("persists across reopen and applies migrations idempotently", () => {
    const directory = mkdtempSync(join(tmpdir(), "habit-repository-"));
    try {
      const path = join(directory, "test.sqlite");
      const first = openDatabase(path);
      let expected;
      try { expected = createRepository(first.db).importWorkbook(workbook()).snapshot; } finally { first.sqlite.close(); }
      const reopened = openDatabase(path);
      try { expect(createRepository(reopened.db).getSnapshot()).toEqual(expected); } finally { reopened.sqlite.close(); }
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});

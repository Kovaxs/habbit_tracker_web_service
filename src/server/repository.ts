import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import type { Habit, ImportPreview, ImportSummary, Snapshot } from "@/lib/types";
import type { ParsedWorkbook } from "@/features/imports/workbook";
import type { openDatabase } from "./db/connection";
import { entries, habits, notes } from "./db/schema";
import { objectInput, validId, validateEntry, validateHabit, validateHabitUpdate, validateNote, ValidationError } from "./validation";

type Database = ReturnType<typeof openDatabase>["db"];

function compatible(existing: Habit): boolean {
  return existing.kind === "count" && existing.tracking === "hourly" && existing.direction === "decrease" && existing.startHour === 0 && existing.endHour === 24;
}

export function createRepository(db: Database) {
  function getSnapshot(): Snapshot {
    return {
      habits: db.select().from(habits).orderBy(asc(habits.createdAt), asc(habits.id)).all(),
      entries: db.select().from(entries).orderBy(asc(entries.date), asc(entries.habitId), asc(entries.slot)).all(),
      notes: db.select().from(notes).orderBy(asc(notes.date)).all(),
    };
  }

  function findHabit(id: unknown): Habit {
    const habit = db.select().from(habits).where(eq(habits.id, validId(id))).get();
    if (!habit) throw new ValidationError("Habit was not found.");
    return habit;
  }

  function ensureUniqueName(name: string, exceptId?: string) {
    const existing = db.select().from(habits).where(eq(habits.name, name)).get();
    if (existing && existing.id !== exceptId) throw new ValidationError("A habit with this name already exists. Use a different name.");
  }

  return {
    getSnapshot,
    createHabit(input: unknown): Snapshot {
      const value = validateHabit(input);
      return db.transaction(tx => {
        ensureUniqueName(value.name);
        tx.insert(habits).values({ ...value, id: randomUUID(), archived: false, createdAt: new Date().toISOString() }).run();
        return getSnapshot();
      });
    },
    updateHabit(id: unknown, input: unknown): Snapshot {
      const value = validateHabit(input);
      return db.transaction(tx => {
        const previous = findHabit(id);
        ensureUniqueName(value.name, previous.id);
        const first = tx.select({ date: entries.date }).from(entries).where(eq(entries.habitId, previous.id)).orderBy(asc(entries.date)).limit(1).get();
        validateHabitUpdate(previous, value, first?.date);
        tx.update(habits).set(value).where(eq(habits.id, previous.id)).run();
        return getSnapshot();
      });
    },
    setArchived(id: unknown, archived: unknown): Snapshot {
      if (typeof archived !== "boolean") throw new ValidationError("Archived must be true or false.");
      const habit = findHabit(id);
      db.update(habits).set({ archived }).where(eq(habits.id, habit.id)).run();
      return getSnapshot();
    },
    saveEntry(input: unknown): Snapshot {
      return db.transaction(tx => {
        const habit = findHabit(objectInput(input).habitId);
        const entry = validateEntry(input, habit);
        const where = and(eq(entries.habitId, entry.habitId), eq(entries.date, entry.date), eq(entries.slot, entry.slot));
        if (entry.value === null) tx.delete(entries).where(where).run();
        else tx.insert(entries).values({ ...entry, value: entry.value }).onConflictDoUpdate({ target: [entries.habitId, entries.date, entries.slot], set: { value: entry.value } }).run();
        return getSnapshot();
      });
    },
    saveNote(input: unknown): Snapshot {
      const note = validateNote(input);
      if (!note.helped && !note.difficult) db.delete(notes).where(eq(notes.date, note.date)).run();
      else db.insert(notes).values(note).onConflictDoUpdate({ target: notes.date, set: note }).run();
      return getSnapshot();
    },
    previewWorkbook(workbook: ParsedWorkbook): ImportPreview {
      const snapshot = getSnapshot();
      const warnings = [...workbook.preview.warnings];
      const byName = new Map(snapshot.habits.map(habit => [habit.name, habit]));
      const existingEntries = new Map(snapshot.entries.map(entry => [JSON.stringify([entry.habitId, entry.date, entry.slot]), entry.value]));
      let skipped = 0;
      let conflicts = 0;
      for (const input of workbook.habits) {
        const existing = byName.get(input.name);
        if (existing && !compatible(existing)) warnings.push("A matching habit has incompatible settings. Import is blocked until its name or settings change.");
        if (existing && (existing.target !== input.target || existing.reviewHour !== input.reviewHour || existing.unit !== input.unit || existing.archived)) warnings.push("Existing goals, units, review hours, and archive status will be kept.");
        if (existing && input.startDate < existing.startDate) warnings.push("An existing habit's start date will move earlier to include imported weeks.");
      }
      for (const record of workbook.entries) {
        const existing = byName.get(record.habitName);
        if (!existing) continue;
        const key = JSON.stringify([existing.id, record.date, record.slot]);
        if (existingEntries.has(key)) {
          skipped++;
          if (existingEntries.get(key) !== record.value) conflicts++;
        }
      }
      if (skipped) warnings.push(`${skipped} existing records will be skipped, including ${conflicts} with different values. Existing values will not change.`);
      const dates = new Set(snapshot.notes.map(note => note.date));
      const skippedNotes = workbook.notes.filter(note => dates.has(note.date)).length;
      if (skippedNotes) warnings.push(`${skippedNotes} existing notes will be kept without changes.`);
      return { ...workbook.preview, warnings: [...new Set(warnings)] };
    },
    importWorkbook(workbook: ParsedWorkbook): { snapshot: Snapshot; summary: ImportSummary } {
      // All checks and all writes are inside one synchronous SQLite transaction.
      return db.transaction(tx => {
        const summary: ImportSummary = { habitsAdded: 0, entriesAdded: 0, entriesSkipped: 0, notesAdded: 0 };
        const byName = new Map<string, Habit>();
        for (const raw of workbook.habits) {
          const input = validateHabit(raw);
          if (input.kind !== "count" || input.tracking !== "hourly" || input.direction !== "decrease" || input.startHour !== 0 || input.endHour !== 24) throw new ValidationError("Imported habits must use hourly decrease counts with a full-day grid.");
          if (byName.has(input.name)) throw new ValidationError("Duplicate habit definitions in workbook.");
          let habit = tx.select().from(habits).where(eq(habits.name, input.name)).get();
          if (habit) {
            if (!compatible(habit)) throw new ValidationError("A matching habit has incompatible settings. Use another name or restore hourly decrease-count tracking with hours 00:00–24:00.");
            if (input.startDate < habit.startDate) {
              tx.update(habits).set({ startDate: input.startDate }).where(eq(habits.id, habit.id)).run();
              habit = { ...habit, startDate: input.startDate };
            }
          } else {
            habit = { ...input, id: randomUUID(), archived: false, createdAt: new Date().toISOString() };
            tx.insert(habits).values(habit).run();
            summary.habitsAdded++;
          }
          byName.set(input.name, habit);
        }
        const seen = new Map<string, number>();
        for (const raw of workbook.entries) {
          const habit = byName.get(raw.habitName);
          if (!habit) throw new ValidationError("A workbook record refers to an unknown habit.");
          const entry = validateEntry({ ...raw, habitId: habit.id }, habit);
          if (entry.value === null) throw new ValidationError("An imported record cannot be null. Leave blank cells out of the import.");
          const key = JSON.stringify([entry.habitId, entry.date, entry.slot]);
          if (seen.has(key) && seen.get(key) !== entry.value) throw new ValidationError("Duplicate workbook records have different values.");
          seen.set(key, entry.value);
          const result = tx.insert(entries).values({ ...entry, value: entry.value }).onConflictDoNothing().run();
          if (result.changes) summary.entriesAdded++;
          else summary.entriesSkipped++;
        }
        const seenNotes = new Map<string, string>();
        for (const raw of workbook.notes) {
          const note = validateNote(raw);
          const serialized = JSON.stringify(note);
          if (seenNotes.has(note.date) && seenNotes.get(note.date) !== serialized) throw new ValidationError("Duplicate workbook notes have different text.");
          seenNotes.set(note.date, serialized);
          if (!note.helped && !note.difficult) continue;
          summary.notesAdded += tx.insert(notes).values(note).onConflictDoNothing().run().changes;
        }
        return { snapshot: getSnapshot(), summary };
      });
    },
  };
}

import { sql } from "drizzle-orm";
import { check, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const habits = sqliteTable("habits", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["count", "completion"] }).notNull(),
  tracking: text("tracking", { enum: ["daily", "hourly"] }).notNull(),
  direction: text("direction", { enum: ["increase", "decrease"] }).notNull(),
  target: integer("target").notNull(),
  unit: text("unit").notNull(),
  startDate: text("start_date").notNull(),
  startHour: integer("start_hour").notNull(),
  endHour: integer("end_hour").notNull(),
  reviewHour: integer("review_hour").notNull(),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
}, table => [
  uniqueIndex("habits_name_unique").on(table.name),
  check("habit_kind", sql`${table.kind} in ('count', 'completion')`),
  check("habit_tracking", sql`${table.tracking} in ('daily', 'hourly')`),
  check("habit_direction", sql`${table.direction} in ('increase', 'decrease')`),
  check("habit_target", sql`${table.target} between 0 and 1000000 and typeof(${table.target}) = 'integer'`),
  check("habit_completion", sql`${table.kind} != 'completion' or (${table.target} = 1 and ${table.direction} = 'increase')`),
  check("habit_hours", sql`${table.startHour} between 0 and 23 and ${table.endHour} between 1 and 24 and ${table.startHour} < ${table.endHour} and ${table.reviewHour} between 0 and 24`),
]);

export const entries = sqliteTable("entries", {
  habitId: text("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  slot: integer("slot").notNull(),
  value: integer("value").notNull(),
}, table => [
  primaryKey({ columns: [table.habitId, table.date, table.slot] }),
  check("entry_value", sql`${table.value} between 0 and 1000000 and typeof(${table.value}) = 'integer'`),
  check("entry_slot", sql`${table.slot} between -1 and 23 and typeof(${table.slot}) = 'integer'`),
]);

export const notes = sqliteTable("notes", {
  date: text("date").primaryKey(),
  helped: text("helped").notNull(),
  difficult: text("difficult").notNull(),
}, table => [
  check("note_length", sql`length(${table.helped}) <= 4000 and length(${table.difficult}) <= 4000`),
]);

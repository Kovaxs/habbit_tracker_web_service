/** Serializable domain contracts. Dates are local calendar dates (YYYY-MM-DD). */
export type HabitKind = "count" | "completion";
export type Tracking = "daily" | "hourly";
export type Direction = "increase" | "decrease";

export interface HabitInput {
  name: string;
  kind: HabitKind;
  tracking: Tracking;
  direction: Direction;
  target: number;
  unit: string;
  startDate: string;
  startHour: number; // inclusive, 0–23
  endHour: number; // exclusive, 1–24
  reviewHour: number; // hours before this belong to the first review
}
export interface Habit extends HabitInput {
  id: string;
  archived: boolean;
  createdAt: string;
}
export interface Entry {
  habitId: string;
  date: string;
  slot: number; // -1 for daily records; 0–23 for hourly records
  value: number; // absence of a row means not reviewed; 0 is a reviewed zero
}
export interface Note {
  date: string;
  helped: string;
  difficult: string;
}
export interface Snapshot {
  habits: Habit[];
  entries: Entry[];
  notes: Note[];
}
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };
export interface ImportPreview {
  habits: string[];
  sheets: number;
  entries: number;
  zeroes: number;
  notes: number;
  from: string;
  to: string;
  warnings: string[];
}
export interface ImportSummary {
  habitsAdded: number;
  entriesAdded: number;
  entriesSkipped: number;
  notesAdded: number;
}

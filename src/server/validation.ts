import type { Entry, Habit, HabitInput, Note } from "@/lib/types";

/** Safe to show to a user. Never include raw input or database errors. */
export class ValidationError extends Error {}

export function objectInput(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("Provide a valid input object.");
  }
  return value as Record<string, unknown>;
}

export function integer(value: unknown, min: number, max: number, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`${label} must be a whole number from ${min} to ${max}.`);
  }
  return value;
}

export function text(value: unknown, max: number, label: string, required = false): string {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) {
    throw new ValidationError(`${label} must be ${required ? "1" : "0"}–${max} characters.`);
  }
  return value.trim();
}

export function validDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError("Use a real date in YYYY-MM-DD format (1900–2100).");
  }
  const year = Number(value.slice(0, 4));
  const date = new Date(`${value}T00:00:00.000Z`);
  if (year < 1900 || year > 2100 || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ValidationError("Use a real date in YYYY-MM-DD format (1900–2100).");
  }
  return value;
}

export function validId(value: unknown): string {
  return text(value, 100, "Habit ID", true);
}

export function validateHabit(value: unknown): HabitInput {
  const input = objectInput(value);
  const name = text(input.name, 80, "Habit name", true);
  const unit = text(input.unit, 20, "Unit");
  if (input.kind !== "count" && input.kind !== "completion") throw new ValidationError("Choose count or completion.");
  if (input.tracking !== "daily" && input.tracking !== "hourly") throw new ValidationError("Choose daily or hourly tracking.");
  if (input.direction !== "increase" && input.direction !== "decrease") throw new ValidationError("Choose an increase or decrease goal.");
  const target = integer(input.target, 0, 1_000_000, "Target");
  if (input.kind === "completion" && (target !== 1 || input.direction !== "increase")) {
    throw new ValidationError("Completion habits need a target of 1 and an increase goal.");
  }
  const startHour = integer(input.startHour, 0, 23, "Start hour");
  const endHour = integer(input.endHour, 1, 24, "End hour");
  if (startHour >= endHour) throw new ValidationError("End hour must be after start hour.");
  return {
    name, unit, kind: input.kind, tracking: input.tracking, direction: input.direction, target,
    startDate: validDate(input.startDate), startHour, endHour,
    reviewHour: integer(input.reviewHour, 0, 24, "Review hour"),
  };
}

export type EntryInput = Omit<Entry, "value"> & { value: number | null };

export function validateEntry(value: unknown, habit: Habit): EntryInput {
  const input = objectInput(value);
  const habitId = validId(input.habitId);
  if (habitId !== habit.id) throw new ValidationError("Habit was not found.");
  const date = validDate(input.date);
  if (date < habit.startDate) throw new ValidationError("Records cannot be before the habit start date.");
  const slot = habit.tracking === "daily"
    ? integer(input.slot, -1, -1, "Daily slot")
    : integer(input.slot, habit.startHour, habit.endHour - 1, "Hourly slot");
  return { habitId, date, slot, value: input.value === null ? null : integer(input.value, 0, habit.kind === "completion" ? 1 : 1_000_000, "Record value") };
}

export function validateNote(value: unknown): Note {
  const input = objectInput(value);
  return { date: validDate(input.date), helped: text(input.helped, 4000, "Helped note"), difficult: text(input.difficult, 4000, "Difficulty note") };
}

export function validateHabitUpdate(previous: Habit, next: HabitInput, earliestRecord?: string): void {
  if (!earliestRecord) return;
  if (["kind", "tracking", "startHour", "endHour"].some(key => previous[key as keyof Habit] !== next[key as keyof HabitInput])) {
    throw new ValidationError("Kind, tracking, and tracked hours cannot change after records exist.");
  }
  if (next.startDate > earliestRecord) throw new ValidationError("Start date must be on or before the earliest record.");
}

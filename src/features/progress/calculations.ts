import { dateRange } from "@/lib/dates";
import type { Entry, Habit } from "@/lib/types";

export function expectedSlots(habit: Habit): number[] {
  return habit.tracking === "daily"
    ? [-1]
    : Array.from({ length: habit.endHour - habit.startHour }, (_, i) => habit.startHour + i);
}

export function dailyProgress(habit: Habit, date: string, entries: Entry[]) {
  const slots = date < habit.startDate ? [] : expectedSlots(habit);
  const records = entries.filter((entry) => entry.habitId === habit.id && entry.date === date && slots.includes(entry.slot));
  const reviewed = records.length;
  const total = reviewed ? records.reduce((sum, entry) => sum + entry.value, 0) : null;
  const complete = slots.length > 0 && reviewed === slots.length;
  const target = habit.kind === "completion" ? slots.length : habit.target;
  const met = complete && total !== null && (habit.direction === "increase" ? total >= target : total <= target);
  // A partial review is not a zero review. Each subtotal includes its own coverage.
  function review(first: boolean) {
    const periodSlots = slots.filter((slot) => first ? slot < habit.reviewHour : slot >= habit.reviewHour);
    const periodRecords = records.filter((entry) => periodSlots.includes(entry.slot));
    return {
      expected: periodSlots.length,
      reviewed: periodRecords.length,
      total: periodRecords.length ? periodRecords.reduce((sum, entry) => sum + entry.value, 0) : null,
    };
  }
  return { date, expected: slots.length, reviewed, total, complete, met, target, before: review(true), after: review(false) };
}

export function progressSummary(habit: Habit, from: string, to: string, entries: Entry[]) {
  const relevant = entries.filter((entry) => entry.habitId === habit.id && entry.date >= from && entry.date <= to);
  const byDate = new Map<string, Entry[]>();
  for (const entry of relevant) byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry]);
  const days = dateRange(from, to).map((date) => dailyProgress(habit, date, byDate.get(date) ?? []));
  const expected = days.reduce((sum, day) => sum + day.expected, 0);
  const reviewed = days.reduce((sum, day) => sum + day.reviewed, 0);
  return {
    days,
    expected,
    reviewed,
    coverage: expected ? Math.round(reviewed / expected * 100) : 0,
    total: reviewed ? days.reduce((sum, day) => sum + (day.total ?? 0), 0) : null,
    completeDays: days.filter((day) => day.complete).length,
    metDays: days.filter((day) => day.met).length,
  };
}

export function goalLabel(habit: Habit): string {
  if (habit.kind === "completion") return `Complete ${habit.tracking === "hourly" ? "each tracked hour" : "once a day"}`;
  return `${habit.direction === "increase" ? "At least" : "At most"} ${habit.target} ${habit.unit || "occurrences"} / day`;
}

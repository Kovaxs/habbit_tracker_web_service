import { describe, expect, it } from "vitest";
import type { Habit, HabitInput } from "@/lib/types";
import { validDate, validateEntry, validateHabit, validateHabitUpdate, validateNote } from "@/server/validation";

const input: HabitInput = { name: "Read", kind: "count", tracking: "hourly", direction: "increase", target: 10, unit: "pages", startDate: "2024-02-01", startHour: 8, endHour: 22, reviewHour: 14 };
const habit: Habit = { ...input, id: "test", archived: false, createdAt: "2024-02-01T00:00:00Z" };

describe("server validation", () => {
  it.each(["1900-01-01", "2000-02-29", "2024-02-29", "2100-12-31"])("accepts real date %s", date => expect(validDate(date)).toBe(date));
  it.each(["1900-02-29", "2100-02-29", "2024-02-30", "2024-04-31", "2024-1-01", "1899-12-31", "2101-01-01", "2024-01-01T00:00:00Z", "", null, 1])("rejects invalid date %s", date => expect(() => validDate(date)).toThrow());
  it("validates habit fields without coercion", () => {
    expect(validateHabit(input)).toEqual(input);
    for (const change of [{ name: " " }, { name: "a".repeat(81) }, { unit: "a".repeat(21) }, { kind: "other" }, { tracking: "other" }, { direction: "other" }, { target: 1.5 }, { target: "1" }, { target: Infinity }, { target: -1 }, { target: 1_000_001 }, { startHour: 24 }, { endHour: 8 }, { reviewHour: 25 }]) expect(() => validateHabit({ ...input, ...change })).toThrow();
    expect(() => validateHabit(null)).toThrow();
    expect(() => validateHabit({ ...input, kind: "completion" })).toThrow();
    expect(() => validateHabit({ ...input, kind: "completion", target: 1, direction: "decrease" })).toThrow();
    expect(validateHabit({ ...input, kind: "completion", target: 1 }).target).toBe(1);
  });
  it("preserves zero and null and enforces hour boundaries", () => {
    for (const value of [0, 1_000_000, null]) expect(validateEntry({ habitId: "test", date: "2024-02-01", slot: 8, value }, habit).value).toBe(value);
    for (const value of [-1, 0.5, NaN, Infinity, "0", undefined, 1_000_001]) expect(() => validateEntry({ habitId: "test", date: "2024-02-01", slot: 8, value }, habit)).toThrow();
    for (const slot of [-1, 7, 22, 8.5]) expect(() => validateEntry({ habitId: "test", date: "2024-02-01", slot, value: 0 }, habit)).toThrow();
    expect(() => validateEntry({ habitId: "test", date: "2024-01-31", slot: 8, value: null }, habit)).toThrow();
    expect(() => validateEntry({ habitId: "test", date: "2024-02-01", slot: 8, value: 2 }, { ...habit, kind: "completion", target: 1 })).toThrow();
    expect(validateEntry({ habitId: "test", date: "2024-02-01", slot: -1, value: 0 }, { ...habit, tracking: "daily" }).slot).toBe(-1);
  });
  it("locks structural settings only after records exist", () => {
    for (const change of [{ tracking: "daily" as const }, { kind: "completion" as const }, { startHour: 9 }, { endHour: 23 }]) {
      expect(() => validateHabitUpdate(habit, { ...input, ...change }, "2024-02-10")).toThrow();
      expect(() => validateHabitUpdate(habit, { ...input, ...change })).not.toThrow();
    }
    expect(() => validateHabitUpdate(habit, { ...input, startDate: "2024-02-11" }, "2024-02-10")).toThrow();
    expect(() => validateHabitUpdate(habit, { ...input, startDate: "2024-02-10", reviewHour: 12 }, "2024-02-10")).not.toThrow();
  });
  it("validates notes individually", () => {
    expect(validateNote({ date: "2024-02-01", helped: " x ", difficult: "" }).helped).toBe("x");
    expect(() => validateNote({ date: "2024-02-01", helped: "a".repeat(4001), difficult: "" })).toThrow();
    expect(() => validateNote({ date: "2024-02-01", helped: "", difficult: null })).toThrow();
  });
});

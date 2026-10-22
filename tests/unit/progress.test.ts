import { describe, expect, it } from "vitest";
import { addDays, dateRange, localDate, weekStart } from "@/lib/dates";
import { dailyProgress, progressSummary } from "@/features/progress/calculations";
import type { Entry, Habit } from "@/lib/types";

const habit: Habit = { id: "test", name: "Test", kind: "count", tracking: "hourly", direction: "decrease", target: 0, unit: "times", startDate: "2026-01-01", startHour: 13, endHour: 15, reviewHour: 14, archived: false, createdAt: "2026-01-01" };
const entry = (slot: number, value: number, date = "2026-01-05"): Entry => ({ habitId: habit.id, date, slot, value });

describe("calendar dates", () => {
  it("uses Monday weeks across years and on Sundays", () => {
    expect(weekStart("2026-01-01")).toBe("2025-12-29");
    expect(weekStart("2026-01-04")).toBe("2025-12-29");
    expect(weekStart("2026-01-05")).toBe("2026-01-05");
  });
  it("does not shift dates at DST or leap days", () => {
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(dateRange("2026-12-31", "2027-01-02")).toHaveLength(3);
    expect(localDate(new Date(2026, 0, 2, 0, 1))).toBe("2026-01-02");
  });
});

describe("progress and coverage", () => {
  it("keeps no record different from reviewed zero", () => {
    expect(dailyProgress(habit, "2026-01-05", [])).toMatchObject({ total: null, reviewed: 0, met: false });
    expect(dailyProgress(habit, "2026-01-05", [entry(13, 0)])).toMatchObject({ total: 0, reviewed: 1, complete: false, met: false });
    expect(dailyProgress(habit, "2026-01-05", [entry(13, 0), entry(14, 0)])).toMatchObject({ total: 0, complete: true, met: true });
  });
  it("puts the boundary hour in the second review", () => {
    const result = dailyProgress(habit, "2026-01-05", [entry(13, 2), entry(14, 3)]);
    expect(result.before).toEqual({ expected: 1, reviewed: 1, total: 2 });
    expect(result.after).toEqual({ expected: 1, reviewed: 1, total: 3 });
    expect(result.total).toBe(5);
    expect(result.met).toBe(false);
  });
  it("does not fill in missing review subtotals", () => {
    expect(dailyProgress(habit, "2026-01-05", [entry(13, 0)]).after.total).toBeNull();
  });
  it("supports increase goals, daily records, and completion", () => {
    const daily: Habit = { ...habit, tracking: "daily", direction: "increase", target: 3 };
    expect(dailyProgress(daily, "2026-01-05", [entry(-1, 3), entry(13, 100)]).met).toBe(true);
    expect(dailyProgress(daily, "2026-01-05", [entry(-1, 2)]).met).toBe(false);
    const completion: Habit = { ...daily, kind: "completion", target: 1 };
    expect(dailyProgress(completion, "2026-01-05", [entry(-1, 0)]).met).toBe(false);
    expect(dailyProgress(completion, "2026-01-05", [entry(-1, 1)]).met).toBe(true);
  });
  it("requires every hourly completion and every reviewed slot", () => {
    const completion: Habit = { ...habit, kind: "completion", direction: "increase", target: 1 };
    expect(dailyProgress(completion, "2026-01-05", [entry(13, 1)]).met).toBe(false);
    expect(dailyProgress(completion, "2026-01-05", [entry(13, 1), entry(14, 0)]).met).toBe(false);
    expect(dailyProgress(completion, "2026-01-05", [entry(13, 1), entry(14, 1)]).met).toBe(true);
  });
  it("reports coverage with gaps and excludes days before start", () => {
    const result = progressSummary(habit, "2025-12-31", "2026-01-06", [entry(13, 0), entry(14, 0)]);
    expect(result.expected).toBe(12);
    expect(result.reviewed).toBe(2);
    expect(result.coverage).toBe(17);
    expect(result.metDays).toBe(1);
    expect(result.completeDays).toBe(1);
    expect(result.days[0].expected).toBe(0);
    expect(result.days.at(-1)?.total).toBeNull();
  });
});

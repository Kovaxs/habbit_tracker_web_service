import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getDatabasePath } from "@/lib/config";

describe("database configuration", () => {
  it("uses a local data directory by default", () => {
    expect(getDatabasePath({})).toBe(resolve("data/habit-tracker.sqlite"));
  });
  it("accepts a configured path", () => {
    expect(getDatabasePath({ DATABASE_PATH: "./custom/test.sqlite" })).toBe(resolve("custom/test.sqlite"));
  });
  it("rejects an empty path", () => {
    expect(() => getDatabasePath({ DATABASE_PATH: " " })).toThrow("DATABASE_PATH must not be empty.");
  });
});

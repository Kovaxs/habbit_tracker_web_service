import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "@/server/db/connection";
import { createProfile, findProfile, listProfiles } from "@/server/profiles";

let connection: ReturnType<typeof openDatabase>;
beforeEach(() => { connection = openDatabase(":memory:"); });
afterEach(() => connection.sqlite.close());

describe("profiles", () => {
  it("starts with Personal and creates profiles without credentials", () => {
    expect(listProfiles(connection.db)).toEqual([expect.objectContaining({ id: "default", name: "Personal" })]);
    const profile = createProfile(connection.db, "  Alex  ");
    expect(profile).toMatchObject({ name: "Alex" });
    expect(profile.id).not.toBe("default");
    expect(findProfile(connection.db, profile.id)).toEqual(profile);
    expect(listProfiles(connection.db).map(item => item.name)).toEqual(["Personal", "Alex"]);
  });
  it("validates missing, duplicate and unknown profiles", () => {
    createProfile(connection.db, "Alex");
    for (const name of ["", " ", "Alex", "a".repeat(41), null, 1]) expect(() => createProfile(connection.db, name)).toThrow();
    for (const id of ["", "unknown", null, 1]) expect(() => findProfile(connection.db, id)).toThrow();
    expect(listProfiles(connection.db)).toHaveLength(2);
  });
});

import "server-only";
import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import type { Profile } from "@/lib/types";
import type { openDatabase } from "./db/connection";
import { profiles } from "./db/schema";
import { text, ValidationError } from "./validation";

type Database = ReturnType<typeof openDatabase>["db"];

export const DEFAULT_PROFILE_ID = "default";

export function listProfiles(db: Database): Profile[] {
  return db.select().from(profiles).orderBy(asc(profiles.createdAt), asc(profiles.id)).all();
}

export function findProfile(db: Database, id: unknown): Profile {
  const profileId = text(id, 100, "Profile ID", true);
  const profile = db.select().from(profiles).where(eq(profiles.id, profileId)).get();
  if (!profile) throw new ValidationError("Profile was not found.");
  return profile;
}

export function createProfile(db: Database, input: unknown): Profile {
  const name = text(input, 40, "Profile name", true);
  const existing = db.select().from(profiles).where(eq(profiles.name, name)).get();
  if (existing) throw new ValidationError("A profile with this name already exists. Use a different name.");
  const profile = { id: randomUUID(), name, createdAt: new Date().toISOString() };
  db.insert(profiles).values(profile).run();
  return profile;
}

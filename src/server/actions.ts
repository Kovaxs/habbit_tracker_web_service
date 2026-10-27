"use server";

import { cookies } from "next/headers";
import type { HabitInput, ImportPreview, ImportSummary, Note, Profile, Result, Snapshot, Workspace } from "@/lib/types";
import { MAX_UPLOAD_BYTES, parseWorkbook } from "@/features/imports/workbook";
import { getDb } from "./db";
import { createProfile, findProfile, listProfiles } from "./profiles";
import { createRepository } from "./repository";
import { ValidationError, type EntryInput } from "./validation";

const PROFILE_COOKIE = "habit-tracker-profile";

async function result<T>(operation: () => T | Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await operation() };
  } catch (error) {
    // Do not log record data or return database paths / internal exceptions.
    return { ok: false, error: error instanceof ValidationError ? error.message : "The operation could not be completed. Please try again." };
  }
}

async function rememberProfile(id: string) {
  (await cookies()).set(PROFILE_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
}

async function activeProfile(): Promise<Profile> {
  const profiles = listProfiles(getDb());
  const selected = (await cookies()).get(PROFILE_COOKIE)?.value;
  const profile = profiles.find(item => item.id === selected) ?? profiles[0];
  if (!profile) throw new ValidationError("No profile is available.");
  return profile;
}

async function repository(expectedProfileId: unknown) {
  const profile = await activeProfile();
  if (profile.id !== expectedProfileId) throw new ValidationError("The active profile changed in another tab. Reload this tab before saving.");
  return createRepository(getDb(), profile.id);
}

function workspace(profile: Profile): Workspace {
  const db = getDb();
  return { profiles: listProfiles(db), activeProfile: profile, ...createRepository(db, profile.id).getSnapshot() };
}

async function uploadedWorkbook(formData: FormData) {
  if (!(formData instanceof FormData)) throw new ValidationError("Choose an XLSX file to upload.");
  const files = formData.getAll("file");
  const file = files[0];
  if (files.length !== 1 || !(file instanceof File) || !/\.xlsx$/i.test(file.name)) throw new ValidationError("Choose one .xlsx file in the file field.");
  if (!file.size || file.size > MAX_UPLOAD_BYTES) throw new ValidationError("Choose an XLSX file no larger than 2 MB.");
  return parseWorkbook(new Uint8Array(await file.arrayBuffer()));
}

export async function getWorkspace(): Promise<Result<Workspace>> {
  return result(async () => {
    const profile = await activeProfile();
    await rememberProfile(profile.id);
    return workspace(profile);
  });
}
export async function addProfile(name: string): Promise<Result<Workspace>> {
  return result(async () => {
    const profile = createProfile(getDb(), name);
    await rememberProfile(profile.id);
    return workspace(profile);
  });
}
export async function selectProfile(id: string): Promise<Result<Workspace>> {
  return result(async () => {
    const profile = findProfile(getDb(), id);
    await rememberProfile(profile.id);
    return workspace(profile);
  });
}
export async function createHabit(input: HabitInput, expectedProfileId: string): Promise<Result<Snapshot>> {
  return result(async () => (await repository(expectedProfileId)).createHabit(input));
}
export async function updateHabit(id: string, input: HabitInput, expectedProfileId: string): Promise<Result<Snapshot>> {
  return result(async () => (await repository(expectedProfileId)).updateHabit(id, input));
}
export async function setArchived(id: string, archived: boolean, expectedProfileId: string): Promise<Result<Snapshot>> {
  return result(async () => (await repository(expectedProfileId)).setArchived(id, archived));
}
export async function saveEntry(input: EntryInput, expectedProfileId: string): Promise<Result<Snapshot>> {
  return result(async () => (await repository(expectedProfileId)).saveEntry(input));
}
export async function saveNote(input: Note, expectedProfileId: string): Promise<Result<Snapshot>> {
  return result(async () => (await repository(expectedProfileId)).saveNote(input));
}
export async function previewWorkbook(formData: FormData, expectedProfileId: string): Promise<Result<ImportPreview>> {
  return result(async () => {
    const workbook = await uploadedWorkbook(formData);
    return (await repository(expectedProfileId)).previewWorkbook(workbook);
  });
}
export async function importWorkbook(formData: FormData, expectedProfileId: string): Promise<Result<{ snapshot: Snapshot; summary: ImportSummary }>> {
  return result(async () => {
    const workbook = await uploadedWorkbook(formData);
    return (await repository(expectedProfileId)).importWorkbook(workbook);
  });
}

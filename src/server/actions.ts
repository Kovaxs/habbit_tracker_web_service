"use server";

import type { HabitInput, ImportPreview, ImportSummary, Note, Result, Snapshot } from "@/lib/types";
import { MAX_UPLOAD_BYTES, parseWorkbook } from "@/features/imports/workbook";
import { getDb } from "./db";
import { createRepository } from "./repository";
import { ValidationError, type EntryInput } from "./validation";

async function result<T>(operation: () => T | Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await operation() };
  } catch (error) {
    // Do not log record data or return database paths / internal exceptions.
    return { ok: false, error: error instanceof ValidationError ? error.message : "The operation could not be completed. Please try again." };
  }
}

function repository() { return createRepository(getDb()); }

async function uploadedWorkbook(formData: FormData) {
  if (!(formData instanceof FormData)) throw new ValidationError("Choose an XLSX file to upload.");
  const files = formData.getAll("file");
  const file = files[0];
  if (files.length !== 1 || !(file instanceof File) || !/\.xlsx$/i.test(file.name)) throw new ValidationError("Choose one .xlsx file in the file field.");
  if (!file.size || file.size > MAX_UPLOAD_BYTES) throw new ValidationError("Choose an XLSX file no larger than 2 MB.");
  return parseWorkbook(new Uint8Array(await file.arrayBuffer()));
}

export async function getSnapshot(): Promise<Result<Snapshot>> {
  return result(() => repository().getSnapshot());
}
export async function createHabit(input: HabitInput): Promise<Result<Snapshot>> {
  return result(() => repository().createHabit(input));
}
export async function updateHabit(id: string, input: HabitInput): Promise<Result<Snapshot>> {
  return result(() => repository().updateHabit(id, input));
}
export async function setArchived(id: string, archived: boolean): Promise<Result<Snapshot>> {
  return result(() => repository().setArchived(id, archived));
}
export async function saveEntry(input: EntryInput): Promise<Result<Snapshot>> {
  return result(() => repository().saveEntry(input));
}
export async function saveNote(input: Note): Promise<Result<Snapshot>> {
  return result(() => repository().saveNote(input));
}
export async function previewWorkbook(formData: FormData): Promise<Result<ImportPreview>> {
  return result(async () => repository().previewWorkbook(await uploadedWorkbook(formData)));
}
export async function importWorkbook(formData: FormData): Promise<Result<{ snapshot: Snapshot; summary: ImportSummary }>> {
  return result(async () => repository().importWorkbook(await uploadedWorkbook(formData)));
}

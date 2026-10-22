import readXlsxFile from "read-excel-file/node";
import { strFromU8, strToU8, Unzip, UnzipInflate, unzipSync, zipSync } from "fflate";
import type { HabitInput, ImportPreview, Note } from "@/lib/types";
import { integer, validDate, validateHabit, validateNote, ValidationError } from "@/server/validation";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_INFLATED_BYTES = 12 * 1024 * 1024;
const MAX_ZIP_FILES = 256;
const MAX_SHEETS = 100;
const MAX_PARSE_MS = 10_000;

export interface WorkbookEntry { habitName: string; date: string; slot: number; value: number }
export interface ParsedWorkbook {
  habits: HabitInput[];
  entries: WorkbookEntry[];
  notes: Note[];
  preview: ImportPreview;
}

function fail(message: string): never { throw new ValidationError(message); }
function checkTime(start: number) {
  if (Date.now() - start > MAX_PARSE_MS) fail("Workbook processing exceeded 10 seconds. Import fewer weeks.");
}

/** No I/O or database access. Bound both declared and actual ZIP expansion before the XLSX reader. */
function boundedArchive(bytes: Uint8Array, start: number): Record<string, Uint8Array> {
  if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES) fail("Choose an XLSX file no larger than 2 MB.");
  let declared = 0;
  const expected = new Map<string, number>();
  unzipSync(bytes, { filter(file) {
    if (expected.has(file.name) || expected.size >= MAX_ZIP_FILES || file.name.includes("..") || file.name.startsWith("/")) fail("Workbook ZIP structure is not supported.");
    if (file.compression !== 0 && file.compression !== 8) fail("Workbook ZIP compression is not supported.");
    declared += file.originalSize;
    if (declared > MAX_INFLATED_BYTES) fail("Workbook expands beyond the 12 MB limit.");
    expected.set(file.name, file.originalSize);
    return false;
  } });
  const result: Record<string, Uint8Array> = Object.create(null);
  let inflated = 0;
  let discovered = 0;
  const unzip = new Unzip(file => {
    if (++discovered > MAX_ZIP_FILES || !expected.has(file.name) || Object.hasOwn(result, file.name)) fail("Workbook ZIP structure is not supported.");
    const chunks: Uint8Array[] = [];
    let length = 0;
    result[file.name] = new Uint8Array();
    file.ondata = (error, chunk, final) => {
      if (error) fail("Workbook ZIP data is damaged.");
      inflated += chunk.length;
      length += chunk.length;
      checkTime(start);
      if (inflated > MAX_INFLATED_BYTES || length > expected.get(file.name)!) {
        file.terminate();
        fail("Workbook expands beyond its safe size limit.");
      }
      chunks.push(chunk);
      if (final) {
        if (length !== expected.get(file.name)) fail("Workbook ZIP sizes do not match.");
        const data = new Uint8Array(length);
        let offset = 0;
        for (const part of chunks) { data.set(part, offset); offset += part.length; }
        result[file.name] = data;
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  // Small compressed chunks also bound transient output from misleading ZIP headers.
  for (let offset = 0; offset < bytes.length; offset += 1024) {
    checkTime(start);
    unzip.push(bytes.subarray(offset, offset + 1024), offset + 1024 >= bytes.length);
  }
  if (discovered !== expected.size) fail("Workbook ZIP is incomplete.");
  return result;
}

function attribute(attrs: string, key: string): string | undefined {
  return new RegExp(`\\s${key}\\s*=\\s*(["'])(.*?)\\1`, "s").exec(attrs)?.[2];
}

function xmlText(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (_, code: string) => {
    if (code.startsWith("#")) return String.fromCodePoint(code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1)));
    return ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" } as Record<string, string>)[code];
  });
}

function isTemplate(name: string): boolean {
  return /(?:^|[\s_-])(template|plantilla|instructions?|instrucciones|parameters?|parametros)(?:$|[\s_()-])/i.test(normalized(name));
}

function templatePaths(files: Record<string, Uint8Array>): Set<string> {
  const relationships = new Map<string, string>();
  for (const match of strFromU8(files["xl/_rels/workbook.xml.rels"] ?? new Uint8Array()).matchAll(/<Relationship\b([^>]*)\/?\s*>/g)) {
    const id = attribute(match[1], "Id");
    const target = attribute(match[1], "Target");
    if (id && target) relationships.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`);
  }
  const paths = new Set<string>();
  for (const match of strFromU8(files["xl/workbook.xml"] ?? new Uint8Array()).matchAll(/<sheet\b([^>]*)\/?\s*>/g)) {
    if (!isTemplate(xmlText(attribute(match[1], "name") ?? ""))) continue;
    const path = relationships.get(attribute(match[1], "r:id") ?? "");
    if (path) paths.add(path);
  }
  return paths;
}

/** Reject sparse-sheet allocation attacks and cells the reader would silently repair. */
function prepareArchive(files: Record<string, Uint8Array>): boolean {
  let sheets = 0;
  let cells = 0;
  let epoch1904 = false;
  // Match the reader's namespace handling before safety checks, including metadata
  // such as prefixed Excel extension tags. Prefixed row/cell attributes remain rejected.
  for (const [path, bytes] of Object.entries(files)) {
    if (path.endsWith(".xml") || path.endsWith(".rels")) {
      files[path] = strToU8(strFromU8(bytes).replace(/<(\/?)[^<>\s/:]+:([^<>\s/:]+)/g, "<$1$2"));
    }
  }
  const templates = templatePaths(files);
  for (const [path, bytes] of Object.entries(files)) {
    if (!path.endsWith(".xml") && !path.endsWith(".rels")) continue;
    let xml = strFromU8(bytes);
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) fail("Workbook XML declarations are not supported.");
    if (/<!--|<!\[CDATA\[/.test(xml)) fail("Workbook XML comments and CDATA are not supported.");
    // Reject noncanonical tag syntax before using coordinate regexes. In particular,
    // a literal '>' in an attribute must not hide a later r attribute from checks.
    for (const tag of xml.matchAll(/<[^>]*>/g)) {
      if (tag[0].startsWith("<?xml ")) continue;
      if (/^<\/[A-Za-z_][\w.-]*\s*>$/.test(tag[0])) continue;
      if (!/^<[A-Za-z_][\w.-]*(?:\s+[A-Za-z_][\w.:-]*\s*=\s*(?:"[^"<>]*"|'[^'<>]*'))*\s*\/?>$/.test(tag[0])) fail("Workbook XML tag syntax is not supported.");
      if (/^<(?:c|row)\b/.test(tag[0])) {
        const attributes = new Set<string>();
        for (const match of tag[0].matchAll(/\s+([\w.:-]+)\s*=\s*(?:"[^"]*"|'[^']*')/g)) {
          if (attributes.has(match[1]) || (match[1].includes(":") && !match[1].startsWith("xmlns:"))) fail("Workbook has ambiguous cell or row attributes.");
          attributes.add(match[1]);
        }
      }
    }
    if (path === "xl/workbook.xml") epoch1904 = /\bdate1904\s*=\s*["'](?:1|true)["']/.test(xml);
    if (!/<worksheet[\s>]/.test(xml)) continue;
    if (++sheets > MAX_SHEETS) fail("Import at most 100 weekly sheets at a time.");
    let rows = 0;
    for (const row of xml.matchAll(/<row\b([^>]*)>/g)) {
      const r = attribute(row[1], "r");
      if (++rows > 200 || (r !== undefined && (!/^\d{1,3}$/.test(r) || Number(r) < 1 || Number(r) > 200))) fail("Workbook rows exceed the supported weekly layout.");
    }
    const seen = new Set<string>();
    xml = xml.replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (whole: string, attrs: string, body = "") => {
      const address = attribute(attrs, "r");
      const coordinate = /^([A-P])([1-9]\d{0,2})$/.exec(address ?? "");
      if (!coordinate || Number(coordinate[2]) > 200 || ++cells > 100_000 || seen.has(address!)) fail("Workbook has duplicate or unsupported cell coordinates.");
      seen.add(address!);
      if (templates.has(path)) return whole;
      const row = Number(coordinate[2]);
      const column = coordinate[1];
      const record = row >= 20 && row <= 43 && column >= "B" && column <= "H";
      const input = record || ["B3", "B4", "B5"].includes(address!) || (column === "A" && row >= 20 && row <= 43) || row >= 49;
      const formula = /<f(?:\s|>|\/)/.test(body);
      const type = attribute(attrs, "t") ?? "n";
      if (input && [...body.matchAll(/<v(?:\s|>|\/)/g)].length > 1) fail(`Multiple values in input cell ${address}.`);
      if (input && formula) fail(`Formula found in input cell ${address}. Replace it with a value.`);
      if (input && type === "e") fail(`Spreadsheet error in input cell ${address}.`);
      if (record && type !== "n") fail(`Record cell ${address} must contain a whole number or be empty.`);
      if (input && ["s", "b", "d", "str"].includes(type) && !/<v>[^<]+<\/v>/.test(body)) fail(`Missing value in input cell ${address}.`);
      if (input && type === "inlineStr" && !/<t(?:\s[^>]*)?>[\s\S]*?<\/t>/.test(body)) fail(`Missing text in input cell ${address}.`);
      if (record && /<v(?:\s[^>]*)?>\s*<\/v>/.test(body)) fail(`Empty numeric value in record cell ${address}. Clear the cell instead.`);
      if (address === "B4" && type === "d") {
        const value = /<v>([^<]+)<\/v>/.exec(body)?.[1];
        if (!value || !/^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?Z)?$/.test(value)) fail("Week date must be a calendar date without a time.");
        validDate(value.slice(0, 10));
      }
      if (formula) return ""; // Formula totals and date headers are never input records.
      // Read serial dates and times without automatic date-style conversion or Excel's leap-day repair.
      return whole.replace(/\s+s\s*=\s*(["'])[^"']*\1/, "");
    });
    if (templates.has(path)) xml = xml.replace(/<sheetData\b[^>]*>[\s\S]*?<\/sheetData>/, "<sheetData/>");
    files[path] = strToU8(xml);
  }
  if (!sheets) fail("No worksheets were found in this XLSX file.");
  return epoch1904;
}

export function workbookDate(value: unknown, epoch1904 = false): string {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime()) || value.getUTCHours() || value.getUTCMinutes() || value.getUTCSeconds() || value.getUTCMilliseconds()) fail("Week date must be a calendar date without a time.");
    return validDate(value.toISOString().slice(0, 10));
  }
  if (typeof value === "string") return validDate(value);
  if (typeof value !== "number" || !Number.isInteger(value) || value < (epoch1904 ? 0 : 1) || value > 73415 || (!epoch1904 && value === 60)) fail("Week date must be a real Excel date or YYYY-MM-DD date.");
  const epoch = Date.UTC(epoch1904 ? 1904 : 1899, epoch1904 ? 0 : 11, epoch1904 ? 1 : 31);
  return validDate(new Date(epoch + (value - (!epoch1904 && value > 60 ? 1 : 0)) * 86400000).toISOString().slice(0, 10));
}

function addDays(date: string, days: number) {
  return validDate(new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10));
}

function hour(value: unknown, label: string, max = 24): number {
  let result: number;
  if (typeof value === "number") result = value >= 0 && value < 1 ? value * 24 : value;
  else if (typeof value === "string" && /^(?:[01]?\d|2[0-4]):00$/.test(value)) result = Number(value.split(":")[0]);
  else return fail(`${label} must be a whole hour.`);
  if (Math.abs(result - Math.round(result)) > 0.000001) fail(`${label} must be a whole hour.`);
  return integer(Math.round(result), 0, max, label);
}

const normalized = (value: unknown) => typeof value === "string" ? value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

export async function parseWorkbook(bytes: Uint8Array): Promise<ParsedWorkbook> {
  const start = Date.now();
  try {
    const files = boundedArchive(bytes, start);
    const epoch1904 = prepareArchive(files);
    checkTime(start);
    // Repack only the archive already checked, so alternate ZIP headers cannot bypass the bounds.
    const sheets = await readXlsxFile(Buffer.from(zipSync(files, { level: 0 })), { trim: false });
    checkTime(start);
    if (sheets.length > MAX_SHEETS) fail("Import at most 100 weekly sheets at a time.");
    const habits = new Map<string, HabitInput>();
    const entries = new Map<string, WorkbookEntry>();
    const notes = new Map<string, Note>();
    const warnings = new Set<string>(["Imported habits use hourly counts, a decrease goal of 0, and tracked hours 00:00–24:00. Blank cells stay unrecorded."]);
    let weeks = 0;
    let from = "";
    let to = "";
    for (const { sheet, data } of sheets) {
      checkTime(start);
      if (isTemplate(sheet)) {
        warnings.add("Template, instruction, or parameter sheets were skipped.");
        continue;
      }
      const cell = (row: number, column: number): unknown => data[row - 1]?.[column - 1] ?? null;
      if (!normalized(cell(3, 1)).includes("proposito") || !normalized(cell(4, 1)).includes("semana") || normalized(cell(19, 1)) !== "hora") {
        fail(`Sheet ${weeks + 1} does not match the supported weekly layout (purpose B3, Monday B4, hours A20:A43).`);
      }
      const monday = workbookDate(cell(4, 2), epoch1904);
      if (new Date(`${monday}T00:00:00Z`).getUTCDay() !== 1) fail("Each weekly sheet must start on a Monday in B4.");
      const sunday = addDays(monday, 6);
      from = !from || monday < from ? monday : from;
      to = !to || sunday > to ? sunday : to;
      const habit = validateHabit({ name: cell(3, 2), kind: "count", tracking: "hourly", direction: "decrease", target: 0, unit: "times", startDate: monday, startHour: 0, endHour: 24, reviewHour: hour(cell(5, 2), "Review hour") });
      const previous = habits.get(habit.name);
      if (previous && previous.reviewHour !== habit.reviewHour) fail("Sheets for the same habit have different review hours. Make them consistent before import.");
      if (!previous || monday < previous.startDate) habits.set(habit.name, habit);
      for (let slot = 0; slot < 24; slot++) {
        if (hour(cell(slot + 20, 1), "Hour axis", 23) !== slot) fail("The hour axis A20:A43 must contain hours 00:00 through 23:00 in order.");
        for (let day = 0; day < 7; day++) {
          const value = cell(slot + 20, day + 2);
          if (value === null) continue;
          const record: WorkbookEntry = { habitName: habit.name, date: addDays(monday, day), slot, value: integer(value, 0, 1_000_000, `Record at ${String.fromCharCode(66 + day)}${slot + 20}`) };
          const key = JSON.stringify([record.habitName, record.date, slot]);
          const duplicate = entries.get(key);
          if (duplicate && duplicate.value !== record.value) fail("Overlapping weekly sheets have conflicting records.");
          if (duplicate) warnings.add("Identical records in overlapping sheets were counted once.");
          entries.set(key, record);
        }
      }
      // The source provides one unstructured weekly-notes area, not per-day notes.
      const lines: string[] = [];
      for (let row = 49; row <= data.length; row++) {
        for (let col = 1; col <= (data[row - 1]?.length ?? 0); col++) {
          const value = cell(row, col);
          if (value === null || (typeof value === "string" && !value.trim())) continue;
          if (typeof value !== "string") fail("Weekly notes must contain text.");
          lines.push(value.trim());
        }
      }
      if (lines.length) {
        const note = validateNote({ date: monday, helped: `Weekly note:\n${lines.join("\n")}`, difficult: "" });
        const previousNote = notes.get(monday);
        if (previousNote && previousNote.helped !== note.helped) fail("Overlapping weekly sheets have different notes for the same Monday.");
        notes.set(monday, note);
        warnings.add("Unstructured weekly notes are stored in Monday's Helped field with a Weekly note label; their meaning is not inferred.");
      }
      weeks++;
    }
    if (!weeks) fail("No weekly record sheets were found.");
    const records = [...entries.values()];
    return { habits: [...habits.values()], entries: records, notes: [...notes.values()], preview: { habits: [...habits.keys()], sheets: weeks, entries: records.length, zeroes: records.filter(record => record.value === 0).length, notes: notes.size, from, to, warnings: [...warnings] } };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError("The XLSX file is damaged or unsupported. Check its dates, cells, and weekly layout.");
  }
}

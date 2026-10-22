import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { MAX_UPLOAD_BYTES, parseWorkbook, workbookDate } from "@/features/imports/workbook";

const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const text = (address: string, value: string) => `<c r="${address}" t="inlineStr"><is><t>${escape(value)}</t></is></c>`;
const numeric = (address: string, value: number) => `<c r="${address}"><v>${value}</v></c>`;
function weekly(options: { monday?: string | number; review?: number; record?: string; note?: string; extra?: string } = {}) {
  const monday = options.monday ?? "2024-12-30";
  const rows = [
    `<row r="3">${text("A3", "Propósito")}${text("B3", "Synthetic habit")}</row>`,
    `<row r="4">${text("A4", "Semana (lunes)")}${typeof monday === "number" ? numeric("B4", monday) : text("B4", monday)}</row>`,
    `<row r="5">${numeric("B5", options.review ?? 14 / 24)}</row>`,
    `<row r="19">${text("A19", "Hora")}</row>`,
  ];
  for (let hour = 0; hour < 24; hour++) rows.push(`<row r="${20 + hour}">${numeric(`A${20 + hour}`, hour / 24)}${hour === 0 ? options.record ?? numeric("B20", 0) + numeric("H20", 3) : ""}</row>`);
  rows.push(`<row r="44"><c r="B44"><f>SUM(B20:B43)</f><v>999</v></c></row>`);
  if (options.note) rows.push(`<row r="49">${text("A49", options.note)}</row>`);
  return `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.join("")}${options.extra ?? ""}</sheetData></worksheet>`;
}
function xlsx(sheets: { name: string; xml: string }[], extras: Record<string, Uint8Array> = {}) {
  const files: Record<string, Uint8Array> = { ...extras };
  files["[Content_Types].xml"] = strToU8(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`);
  files["xl/workbook.xml"] = strToU8(`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, i) => `<sheet name="${escape(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`);
  files["xl/_rels/workbook.xml.rels"] = strToU8(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`);
  sheets.forEach((sheet, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheet.xml); });
  return zipSync(files);
}
const file = (options: Parameters<typeof weekly>[0] = {}) => xlsx([{ name: "Week", xml: weekly(options) }]);

describe("synthetic XLSX import", () => {
  it("preserves blanks and zeros, review time, Sunday and year edges; ignores totals", async () => {
    const parsed = await parseWorkbook(file({ note: "A synthetic weekly reflection" }));
    expect(parsed.habits[0]).toMatchObject({ name: "Synthetic habit", startDate: "2024-12-30", reviewHour: 14, startHour: 0, endHour: 24, direction: "decrease" });
    expect(parsed.entries).toEqual([{ habitName: "Synthetic habit", date: "2024-12-30", slot: 0, value: 0 }, { habitName: "Synthetic habit", date: "2025-01-05", slot: 0, value: 3 }]);
    expect(parsed.preview).toMatchObject({ sheets: 1, entries: 2, zeroes: 1, notes: 1, from: "2024-12-30", to: "2025-01-05" });
    expect(parsed.notes[0]).toEqual({ date: "2024-12-30", helped: "Weekly note:\nA synthetic weekly reflection", difficult: "" });
  });
  it("handles Excel serial dates and rejects fictitious leap day", async () => {
    expect(workbookDate(1)).toBe("1900-01-01");
    expect(workbookDate(59)).toBe("1900-02-28");
    expect(workbookDate(61)).toBe("1900-03-01");
    expect(workbookDate(0, true)).toBe("1904-01-01");
    expect(() => workbookDate(60)).toThrow();
    expect(() => workbookDate(1.5)).toThrow();
    expect(() => workbookDate("2024-02-30")).toThrow();
    expect((await parseWorkbook(file({ monday: 45656 }))).preview.from).toBe("2024-12-30");
  });
  it("skips template formulas before validating input cells", async () => {
    const parsed = await parseWorkbook(xlsx([{ name: "Week", xml: weekly() }, { name: "Template", xml: weekly({ record: '<c r="B20"><f>1+1</f><v>2</v></c>' }) }]));
    expect(parsed.preview.sheets).toBe(1);
    expect(parsed.preview.warnings.join(" ")).toContain("skipped");
  });
  it("deduplicates identical overlaps and rejects conflicts", async () => {
    const same = await parseWorkbook(xlsx([{ name: "Week", xml: weekly() }, { name: "Copy", xml: weekly() }]));
    expect(same.entries).toHaveLength(2);
    await expect(parseWorkbook(xlsx([{ name: "Week", xml: weekly() }, { name: "Copy", xml: weekly({ record: numeric("B20", 2) }) }]))).rejects.toThrow("conflicting");
  });
  it.each([
    text("B20", "0"), numeric("B20", -1), numeric("B20", 0.5), numeric("B20", 1_000_001),
    '<c r="B20"><f>1+1</f><v>2</v></c>', '<c r="B20" t="e"><v>#VALUE!</v></c>',
    '<c r="B20"><v>0</v><v>5</v></c>', '<c r="B20"><v> </v></c>',
    '<c r="B20"><x:f xmlns:x="urn:test">1+1</x:f><v>2</v></c>',
    '<c r="B20" x:r="XFD999999"><v>2</v></c>',
  ])("rejects malformed record cells without treating them as blank: %s", async record => {
    await expect(parseWorkbook(file({ record }))).rejects.toThrow();
  });
  it("rejects invalid dates, fractional reviews, missing hours and unknown layouts", async () => {
    for (const options of [{ monday: "2024-12-31" }, { monday: "2024-02-30" }, { review: 14.5 / 24 }, { review: 25 }, { note: "a".repeat(4001) }]) await expect(parseWorkbook(file(options))).rejects.toThrow();
    await expect(parseWorkbook(xlsx([{ name: "Bad", xml: weekly().replace("Propósito", "Unknown") }]))).rejects.toThrow("layout");
    await expect(parseWorkbook(xlsx([{ name: "Bad", xml: weekly().replace(numeric("A20", 0), "") }]))).rejects.toThrow("hour");
  });
  it("bounds upload, expansion, sheet coordinates and ZIP entry count", async () => {
    await expect(parseWorkbook(new Uint8Array(MAX_UPLOAD_BYTES + 1))).rejects.toThrow("2 MB");
    await expect(parseWorkbook(xlsx([{ name: "Week", xml: weekly() }], { "huge.xml": new Uint8Array(12 * 1024 * 1024) }))).rejects.toThrow("12 MB");
    await expect(parseWorkbook(file({ extra: '<row r="999999"><c r="A999999"><v>1</v></c></row>' }))).rejects.toThrow();
    await expect(parseWorkbook(file({ extra: '<row foo=">" r="999999"><c r="A49"><v>1</v></c></row>' }))).rejects.toThrow();
    await expect(parseWorkbook(file({ extra: '<x:row xmlns:x="urn:test" r="50000"/>' }))).rejects.toThrow();
    const extra = Object.fromEntries(Array.from({ length: 257 }, (_, i) => [`part${i}`, new Uint8Array()]));
    await expect(parseWorkbook(xlsx([{ name: "Week", xml: weekly() }], extra))).rejects.toThrow();
  });
});

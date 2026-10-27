import { expect, test, type Page } from "@playwright/test";
import { strToU8, zipSync } from "fflate";

const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const cell = (address: string, value: string) => `<c r="${address}" t="inlineStr"><is><t>${escape(value)}</t></is></c>`;
const number = (address: string, value: number) => `<c r="${address}"><v>${value}</v></c>`;
/** A single weekly sheet shaped like the Examen particular workbook: B3 name, B4 Monday, B5 review time, A20:H24 hourly records, row 49+ weekly notes. */
function weeklySheet(options: { habitName: string; monday: string; unknownLayout?: boolean }) {
  const rows = [
    `<row r="3">${cell("A3", options.unknownLayout ? "Unknown" : "Propósito")}${cell("B3", options.habitName)}</row>`,
    `<row r="4">${cell("A4", "Semana (lunes)")}${cell("B4", options.monday)}</row>`,
    `<row r="5">${number("B5", 14 / 24)}</row>`,
    `<row r="19">${cell("A19", "Hora")}</row>`,
  ];
  for (let hour = 0; hour < 24; hour++) rows.push(`<row r="${20 + hour}">${number(`A${20 + hour}`, hour / 24)}${hour === 0 ? `${number("B20", 0)}${number("H20", 3)}` : ""}</row>`);
  rows.push(`<row r="44"><c r="B44"><f>SUM(B20:B43)</f><v>999</v></c></row>`);
  rows.push(`<row r="49">${cell("A49", "A synthetic weekly reflection")}</row>`);
  return `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.join("")}</sheetData></worksheet>`;
}
function workbookXml(sheets: string[]) {
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`),
    "xl/workbook.xml": strToU8(`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((_, i) => `<sheet name="Sheet${i + 1}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`),
  };
  sheets.forEach((xml, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(xml); });
  return zipSync(files);
}
const mondays: Record<string, string> = { chromium: "2024-12-30", webkit: "2025-01-06" };
const weeklyXlsx = (habitName: string, project: string, unknownLayout = false) => Buffer.from(workbookXml([weeklySheet({ habitName, monday: mondays[project] ?? "2025-01-13", unknownLayout })]));

async function openTab(page: Page, name: string) {
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name, exact: true }).click();
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("records, goals, notes and habits work and persist on a small screen", async ({ page }, testInfo) => {
  const suffix = testInfo.project.name;
  const name = `Reading ${suffix}`;
  const completionName = `Walk ${suffix}`;
  const hourlyName = `Focus ${suffix}`;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Habit Tracker", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add habit", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Habit name").fill(name);
  await dialog.getByLabel("Daily target").fill("3");
  await dialog.getByLabel("Unit (optional)").fill("pages");
  await dialog.getByRole("button", { name: "Create habit", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  let card = page.getByRole("article", { name, exact: true });
  await expect(card.getByText("Not reviewed", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Review zero" }).click();
  await expect(card.getByText("Reviewed: zero", { exact: true })).toBeVisible();
  await page.reload();
  card = page.getByRole("article", { name, exact: true });
  await expect(card.getByText("Reviewed: zero", { exact: true })).toBeVisible();
  await card.getByRole("spinbutton").fill("3");
  await card.getByRole("button", { name: `Save amount for ${name}` }).click();
  await expect(card.getByText("Target met", { exact: true })).toBeVisible();
  await openTab(page, "Progress");
  await page.getByRole("combobox", { name: "Habit", exact: true }).selectOption({ label: name });
  await page.getByText("View daily values", { exact: true }).click();
  await expect(page.getByRole("table").getByText("Target met")).toBeVisible();
  await noOverflow(page);
  await openTab(page, "Today");
  await card.getByRole("button", { name: `Clear record for ${name}` }).click();
  await expect(card.getByText("Not reviewed", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Add habit", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Habit name").fill(completionName);
  await dialog.getByLabel("Record type").selectOption("completion");
  await dialog.getByRole("button", { name: "Create habit", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const completion = page.getByRole("article", { name: completionName, exact: true });
  await completion.getByRole("button", { name: "Not done (0)", exact: true }).click();
  await expect(completion.getByText("Reviewed: zero", { exact: true })).toBeVisible();
  await completion.getByRole("button", { name: "Mark complete", exact: true }).click();
  await expect(completion.getByText("Target met", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Add habit", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Habit name").fill(hourlyName);
  await dialog.getByRole("combobox", { name: "Tracking", exact: true }).selectOption("hourly");
  await dialog.getByLabel("Goal direction").selectOption("decrease");
  await dialog.getByLabel("Daily target").fill("0");
  await dialog.getByLabel("First hour").selectOption("13");
  await dialog.getByLabel("End (exclusive)").selectOption("15");
  await dialog.getByRole("button", { name: "Create habit", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const hourly = page.getByRole("article", { name: hourlyName, exact: true });
  await hourly.getByRole("button", { name: "Review", exact: true }).click();
  await hourly.getByRole("button", { name: "13:00: not reviewed", exact: true }).click();
  await hourly.getByRole("button", { name: "Review zero", exact: true }).click();
  await expect(hourly.getByText("1/2 hours · partial", { exact: true })).toBeVisible();
  await hourly.getByRole("button", { name: "14:00: not reviewed", exact: true }).click();
  await hourly.getByRole("button", { name: "Review zero", exact: true }).click();
  await expect(hourly.getByText("Target met", { exact: true })).toBeVisible();
  await page.getByLabel("What helped?").fill("A quiet place.");
  await page.getByLabel("What was difficult?").fill("An interruption.");
  await page.getByRole("button", { name: "Save notes", exact: true }).click();
  await expect(page.getByText("Notes saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("What helped?")).toHaveValue("A quiet place.");
  await expect(page.getByLabel("What was difficult?")).toHaveValue("An interruption.");
  await expect(page.getByRole("article", { name: hourlyName, exact: true }).getByText("Target met", { exact: true })).toBeVisible();
  await noOverflow(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await noOverflow(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await noOverflow(page);
  await page.setViewportSize({ width: 375, height: 812 });

  await openTab(page, "Manage");
  await page.getByRole("button", { name: `Edit ${name}`, exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Habit name").fill(`${name} edited`);
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("heading", { name: `${name} edited`, exact: true })).toBeVisible();
  page.once("dialog", (prompt) => prompt.accept());
  await page.getByRole("button", { name: `Archive ${name} edited`, exact: true }).click();
  await expect(page.getByRole("button", { name: `Restore ${name} edited`, exact: true })).toBeVisible();
  await openTab(page, "Today");
  await expect(page.getByRole("article", { name: `${name} edited`, exact: true })).toHaveCount(0);
  await openTab(page, "Manage");
  await page.getByRole("button", { name: `Restore ${name} edited`, exact: true }).click();
  await expect(page.getByRole("button", { name: `Archive ${name} edited`, exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all data", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^habit-tracker-.*\.json$/);
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("profiles switch without passwords and isolate habits and notes", async ({ page }, testInfo) => {
  const suffix = testInfo.project.name;
  const name = `Shared habit ${suffix}`;
  const profileName = `Alex ${suffix}`;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const profile = page.getByRole("combobox", { name: "Active profile" });
  await expect(profile).toHaveValue("default");
  await page.getByRole("button", { name: "Add habit", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Habit name").fill(name);
  await dialog.getByRole("button", { name: "Create habit", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByLabel("What helped?").fill(`Personal note ${suffix}`);
  await page.getByRole("button", { name: "Save notes", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save notes", exact: true })).toBeEnabled();
  const stalePage = await page.context().newPage();
  stalePage.on("pageerror", (error) => errors.push(error.message));
  await stalePage.goto("/");
  await expect(stalePage.getByRole("combobox", { name: "Active profile" })).toHaveValue("default");

  await page.getByRole("button", { name: "Add profile", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Profile name").fill(profileName);
  await dialog.getByRole("button", { name: "Create profile", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const otherProfileId = await profile.locator("option", { hasText: profileName }).getAttribute("value");
  expect(otherProfileId).toBeTruthy();
  await expect(profile).toHaveValue(otherProfileId ?? "");
  await expect(page.getByRole("article", { name, exact: true })).toHaveCount(0);
  await expect(page.getByLabel("What helped?")).toHaveValue("");
  await page.getByRole("button", { name: "Add habit", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Habit name").fill(name);
  await dialog.getByRole("button", { name: "Create habit", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("article", { name, exact: true })).toBeVisible();
  await page.getByLabel("What helped?").fill(`Other note ${suffix}`);
  await page.getByRole("button", { name: "Save notes", exact: true }).click();

  await profile.selectOption("default");
  await expect(page.getByLabel("What helped?")).toHaveValue(`Personal note ${suffix}`);
  await profile.selectOption({ label: profileName });
  await expect(page.getByLabel("What helped?")).toHaveValue(`Other note ${suffix}`);
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Active profile" })).toHaveValue(otherProfileId ?? "");
  await expect(page.getByLabel("What helped?")).toHaveValue(`Other note ${suffix}`);
  await stalePage.getByLabel("What helped?").fill("This stale tab must not change another profile");
  await stalePage.getByRole("button", { name: "Save notes", exact: true }).click();
  await expect(stalePage.locator(".notice")).toContainText("The active profile changed in another tab. Reload this tab before saving.");
  await expect(page.getByLabel("What helped?")).toHaveValue(`Other note ${suffix}`);
  await stalePage.close();
  expect(errors).toEqual([]);
});

test("workbook import previews, imports, stays idempotent and rejects bad layouts", async ({ page }, testInfo) => {
  const habitName = `Synthetic habit ${testInfo.project.name}`;
  const monday = mondays[testInfo.project.name] ?? "2025-01-13";
  const sunday = new Date(`${monday}T00:00:00Z`);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  const range = `${monday} – ${sunday.toISOString().slice(0, 10)}`;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await openTab(page, "Manage");
  const upload = page.getByLabel("Excel workbook (up to 2 MB)");
  await upload.setInputFiles({ name: "examen-particular.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: weeklyXlsx(habitName, testInfo.project.name) });
  await page.getByRole("button", { name: "Preview import", exact: true }).click();
  const preview = page.locator(".import-preview");
  await expect(preview.getByRole("heading", { name: "Ready to import" })).toBeVisible();
  await expect(preview.getByText(habitName)).toBeVisible();
  await expect(preview.getByText(range)).toBeVisible();
  await expect(preview.getByText("2 (including 1 reviewed zeroes)")).toBeVisible();
  await preview.getByRole("button", { name: "Confirm import", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Import complete. 1 habits added, 2 records added, 0 existing records kept, 1 notes added.");
  await expect(page.locator(".habit-list").getByRole("heading", { name: habitName })).toBeVisible();

  await upload.setInputFiles({ name: "examen-particular.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: weeklyXlsx(habitName, testInfo.project.name) });
  await page.getByRole("button", { name: "Preview import", exact: true }).click();
  await expect(preview.getByRole("heading", { name: "Ready to import" })).toBeVisible();
  await expect(preview.locator(".warning-list")).toContainText("existing records will be skipped");
  await preview.getByRole("button", { name: "Confirm import", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Import complete. 0 habits added, 0 records added, 2 existing records kept, 0 notes added.");

  await upload.setInputFiles({ name: "bad-layout.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: weeklyXlsx(habitName, testInfo.project.name, true) });
  await page.getByRole("button", { name: "Preview import", exact: true }).click();
  await expect(page.locator("#import-workbook").getByRole("alert")).toContainText("layout");
  expect(errors).toEqual([]);
});

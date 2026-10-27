"use client";

import { FileSpreadsheet, Upload } from "lucide-react";
import { useState } from "react";
import { importWorkbook, previewWorkbook } from "@/server/actions";
import type { ImportPreview, ImportSummary, Snapshot } from "@/lib/types";

export function ImportPanel({
  busy,
  onBusyChange,
  onImported,
}: {
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onImported: (snapshot: Snapshot, summary: ImportSummary) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [step, setStep] = useState<"preview" | "import" | null>(null);

  async function run(importNow: boolean) {
    if (!file || busy) return;
    onBusyChange(true);
    setStep(importNow ? "import" : "preview");
    setError("");
    setDone("");
    const data = new FormData();
    data.set("file", file);
    try {
      if (importNow) {
        const result = await importWorkbook(data);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onImported(result.data.snapshot, result.data.summary);
        const summary = result.data.summary;
        setDone(
          `Import complete. ${summary.habitsAdded} habits added, ${summary.entriesAdded} records added, ${summary.entriesSkipped} existing records kept, ${summary.notesAdded} notes added.`,
        );
        setPreview(null);
      } else {
        const result = await previewWorkbook(data);
        if (result.ok) setPreview(result.data);
        else setError(result.error);
      }
    } catch {
      setError(
        "Could not read this workbook. Check your connection and try again.",
      );
    } finally {
      onBusyChange(false);
      setStep(null);
    }
  }

  return (
    <section className="card space-y-4" id="import-workbook">
      <div>
        <h3 className="font-semibold flex items-center gap-2">
          <FileSpreadsheet size={19} />
          Bring your workbook
        </h3>
        <p className="hint mt-2">
          Import the weekly sheets from your Examen particular .xlsx workbook.
          Preview it first. Your original file stays unchanged.
        </p>
      </div>
      <label className="field">
        Excel workbook (up to 2 MB)
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={busy}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setPreview(null);
            setError("");
            setDone("");
          }}
        />
      </label>
      <button
        className="button secondary"
        disabled={!file || busy}
        onClick={() => void run(false)}
      >
        <Upload size={16} />
        {step === "preview" ? "Reading workbook…" : "Preview import"}
      </button>
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="success-box">
          {done}
        </p>
      )}
      {preview && (
        <div className="import-preview space-y-4">
          <h4 className="font-semibold">Ready to import</h4>
          <dl className="preview-facts">
            <dt>Habits</dt>
            <dd>{preview.habits.join(", ")}</dd>
            <dt>Date range</dt>
            <dd>
              {preview.from} – {preview.to}
            </dd>
            <dt>Weekly sheets</dt>
            <dd>{preview.sheets}</dd>
            <dt>Records</dt>
            <dd>
              {preview.entries} (including {preview.zeroes} reviewed zeroes)
            </dd>
            <dt>Notes</dt>
            <dd>{preview.notes}</dd>
          </dl>
          {preview.warnings.length > 0 && (
            <ul className="warning-list">
              {preview.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          )}
          <p className="hint">
            Blanks stay unrecorded. Existing records and notes are kept, not
            overwritten. Reimporting the same workbook does not duplicate them.
          </p>
          <button
            className="button primary w-full"
            disabled={busy}
            onClick={() => void run(true)}
          >
            {step === "import" ? "Importing…" : "Confirm import"}
          </button>
        </div>
      )}
    </section>
  );
}

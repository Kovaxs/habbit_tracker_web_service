"use client";

import { Archive, ArchiveRestore, Download, Pencil, Plus } from "lucide-react";
import { goalLabel } from "@/features/progress/calculations";
import { ImportPanel } from "@/features/imports/import-panel";
import { localDate } from "@/lib/dates";
import type { Habit, ImportSummary, Snapshot } from "@/lib/types";

export function ManageView({
  profileId,
  snapshot,
  busy,
  onBusyChange,
  onAdd,
  onEdit,
  onArchive,
  onImported,
}: {
  profileId: string;
  snapshot: Snapshot;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onAdd: () => void;
  onEdit: (habit: Habit) => void;
  onArchive: (habit: Habit) => void;
  onImported: (snapshot: Snapshot, summary: ImportSummary) => void;
}) {
  function exportData() {
    const blob = new Blob(
      [
        JSON.stringify(
          { version: 1, exportedAt: new Date().toISOString(), ...snapshot },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `habit-tracker-${localDate()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="space-y-5">
      <div className="section-heading">
        <div>
          <h2>Make it yours</h2>
          <p className="hint mt-1">Your habits, your pace.</p>
        </div>
        <button className="button primary" disabled={busy} onClick={onAdd}>
          <Plus size={18} />
          Add habit
        </button>
      </div>
      <section className="card">
        <h3 className="font-semibold mb-2">
          Your habits{" "}
          <span className="muted font-normal">({snapshot.habits.length})</span>
        </h3>
        {!snapshot.habits.length && (
          <p className="muted text-sm py-4">
            No habits yet. Add your first one or import your workbook below.
          </p>
        )}
        <ul className="habit-list">
          {snapshot.habits.map((habit) => (
            <li key={habit.id}>
              <div className="min-w-0">
                <h4 className="font-semibold break-words">
                  {habit.name}{" "}
                  {habit.archived && (
                    <span className="badge ml-1">Archived</span>
                  )}
                </h4>
                <p className="hint mt-1">
                  {goalLabel(habit)} · {habit.tracking}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  className="icon-button"
                  aria-label={`Edit ${habit.name}`}
                  title="Edit habit"
                  disabled={busy}
                  onClick={() => onEdit(habit)}
                >
                  <Pencil size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`${habit.archived ? "Restore" : "Archive"} ${habit.name}`}
                  title={habit.archived ? "Restore habit" : "Archive habit"}
                  disabled={busy}
                  onClick={() => onArchive(habit)}
                >
                  {habit.archived ? (
                    <ArchiveRestore size={18} />
                  ) : (
                    <Archive size={18} />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
        <p className="hint pt-3 border-t border-line">
          Archive a habit to hide it from daily tracking. Its records stay in
          Progress. Restore it at any time.
        </p>
      </section>
      <div className="manage-grid">
        <ImportPanel
          profileId={profileId}
          busy={busy}
          onBusyChange={onBusyChange}
          onImported={onImported}
        />
        <section className="card space-y-4 self-start">
          <h3 className="font-semibold flex items-center gap-2">
            <Download size={19} />
            Keep a copy
          </h3>
          <p className="hint">
            Download all habits, records, and notes as JSON. Keep this file
            private. JSON restore is not available in this version.
          </p>
          <button
            className="button secondary"
            onClick={exportData}
            disabled={busy}
          >
            Export all data
          </button>
          <div className="inset space-y-2 text-sm">
            <strong>Local use only</strong>
            <p className="muted">
              Your data is saved in SQLite on this server. There is no sign-in
              yet. Do not expose the app to the internet or an untrusted
              network.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

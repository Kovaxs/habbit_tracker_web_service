"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/dialog";
import { MIN_DATE, MAX_DATE, hourLabel } from "@/lib/dates";
import type { Habit, HabitInput, Result, Snapshot } from "@/lib/types";

export function HabitForm({
  habit,
  startDate,
  locked,
  onSave,
  onClose,
}: {
  habit?: Habit;
  startDate: string;
  locked: boolean;
  onSave: (input: HabitInput) => Promise<Result<Snapshot>>;
  onClose: () => void;
}) {
  const [kind, setKind] = useState(habit?.kind ?? "count");
  const [tracking, setTracking] = useState(habit?.tracking ?? "daily");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const input: HabitInput = {
      name: String(data.get("name") ?? "").trim(),
      kind,
      tracking,
      direction:
        kind === "completion"
          ? "increase"
          : data.get("direction") === "decrease"
            ? "decrease"
            : "increase",
      target: kind === "completion" ? 1 : Number(data.get("target")),
      unit: kind === "completion" ? "" : String(data.get("unit") ?? "").trim(),
      startDate: String(data.get("startDate")),
      startHour: locked ? habit!.startHour : Number(data.get("startHour") ?? 7),
      endHour: locked ? habit!.endHour : Number(data.get("endHour") ?? 23),
      reviewHour: Number(data.get("reviewHour") ?? 14),
    };
    setBusy(true);
    setError("");
    try {
      const result = await onSave(input);
      if (result.ok) onClose();
      else setError(result.error);
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={habit ? "Edit habit" : "A small step, every day"}
      description={
        habit
          ? "Update your habit. Your records stay safe."
          : "Choose what you want to track. You can add more habits later."
      }
      busy={busy}
    >
      <form onSubmit={submit} className="space-y-5">
        <fieldset disabled={busy} className="space-y-4">
          <label className="field">
            Habit name
            <input
              name="name"
              defaultValue={habit?.name}
              placeholder="e.g. Read a little"
              maxLength={80}
              required
              autoComplete="off"
            />
          </label>
          <div className="form-grid">
            <label className="field">
              Record type
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as HabitInput["kind"])}
                disabled={locked}
              >
                <option value="count">Count / amount</option>
                <option value="completion">Done / not done</option>
              </select>
            </label>
            <label className="field">
              Tracking
              <select
                value={tracking}
                onChange={(e) =>
                  setTracking(e.target.value as HabitInput["tracking"])
                }
                disabled={locked}
              >
                <option value="daily">Daily</option>
                <option value="hourly">Hourly</option>
              </select>
            </label>
          </div>
          {locked && (
            <p className="hint">
              Record type, tracking, and hours are locked because this habit has
              records. Create a new habit to change them.
            </p>
          )}
          {kind === "count" ? (
            <>
              <label className="field">
                Goal direction
                <select
                  name="direction"
                  defaultValue={habit?.direction ?? "increase"}
                >
                  <option value="increase">
                    Increase — at least the target
                  </option>
                  <option value="decrease">
                    Decrease — at most the target
                  </option>
                </select>
              </label>
              <div className="form-grid">
                <label className="field">
                  Daily target
                  <input
                    name="target"
                    type="number"
                    min={0}
                    max={1000000}
                    step={1}
                    inputMode="numeric"
                    defaultValue={habit?.target ?? 1}
                    required
                  />
                </label>
                <label className="field">
                  Unit (optional)
                  <input
                    name="unit"
                    maxLength={20}
                    defaultValue={habit?.unit ?? ""}
                    placeholder="pages, times, ml…"
                  />
                </label>
              </div>
            </>
          ) : (
            <p className="inset text-sm">
              The goal is to complete{" "}
              {tracking === "hourly"
                ? "each tracked hour"
                : "the habit once a day"}
              . A zero means reviewed, but not done.
            </p>
          )}
          <label className="field">
            Start date
            <input
              name="startDate"
              type="date"
              min={MIN_DATE}
              max={MAX_DATE}
              defaultValue={habit?.startDate ?? startDate}
              required
            />
          </label>
          {tracking === "hourly" && (
            <>
              <div className="form-grid">
                <label className="field">
                  First hour
                  <select
                    name="startHour"
                    defaultValue={habit?.startHour ?? 7}
                    disabled={locked}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {hourLabel(h)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  End (exclusive)
                  <select
                    name="endHour"
                    defaultValue={habit?.endHour ?? 23}
                    disabled={locked}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h + 1} value={h + 1}>
                        {hourLabel(h + 1)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field">
                Second review starts at
                <select
                  name="reviewHour"
                  defaultValue={habit?.reviewHour ?? 14}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="hint">
                Hours before this time belong to the first review. The boundary
                hour belongs to the second.
              </p>
            </>
          )}
          {habit && (
            <p className="hint">
              Changes to your target and goal direction also update historical
              progress calculations.
            </p>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            className="button secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : habit ? "Save changes" : "Create habit"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

"use client";

import { Check, ChevronDown, Clock3 } from "lucide-react";
import { useId, useState } from "react";
import { addDays, formatDate, hourLabel, localDate, weekStart } from "@/lib/dates";
import { dailyProgress, expectedSlots, goalLabel } from "@/features/progress/calculations";
import { RecordEditor, type SaveRecord } from "./record-editor";
import type { Entry, Habit } from "@/lib/types";

export function HabitCard({ habit, date, entries, busy, onSave, onDate }: {
  habit: Habit;
  date: string;
  entries: Entry[];
  busy: boolean;
  onSave: SaveRecord;
  onDate: (date: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [hour, setHour] = useState(Math.min(habit.endHour - 1, Math.max(habit.startHour, new Date().getHours())));
  const detailsId = useId();
  const day = dailyProgress(habit, date, entries);
  const slot = habit.tracking === "daily" ? -1 : hour;
  const value = entries.find((entry) => entry.habitId === habit.id && entry.date === date && entry.slot === slot)?.value ?? null;
  const week = weekStart(date);
  const status = !day.reviewed ? "Not reviewed" : !day.complete ? `${day.reviewed}/${day.expected} hours · partial` : day.met ? "Target met" : day.total === 0 ? "Reviewed: zero" : "Reviewed";

  return (
    <article className="card habit-card" aria-label={habit.name}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h3 className="font-semibold text-lg break-words">{habit.name}</h3><p className="hint mt-1">{goalLabel(habit)}</p></div>
        <span className={`badge ${day.met ? "success" : day.reviewed && !day.complete ? "attention" : ""}`}>{day.met && <Check size={13} />}{status}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="record-total">{day.total ?? "—"}</span>
        <span className="muted text-sm">{habit.kind === "completion" ? habit.tracking === "hourly" ? "hours completed" : "completed" : habit.unit || "occurrences"}{day.reviewed > 0 && !day.complete ? " logged so far" : ""}</span>
      </div>
      {habit.tracking === "daily" ? <RecordEditor key={`${date}-${value}`} habit={habit} date={date} slot={-1} value={value} busy={busy} onSave={onSave} /> : <>
        <div className="inset flex items-center justify-between gap-2">
          <div><span className="hint flex items-center gap-1"><Clock3 size={14} />{hourLabel(habit.startHour)}–{hourLabel(habit.endHour)}</span><p className="text-sm mt-1">{day.reviewed} of {day.expected} hours reviewed</p></div>
          <button className="button secondary" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded(!expanded)}>{expanded ? "Close" : "Review"}<ChevronDown size={16} className={expanded ? "rotate-180" : ""} /></button>
        </div>
        {expanded && <section id={detailsId} className="hour-details space-y-4" aria-label={`Hourly records for ${habit.name}`}>
          <div className="hour-grid" aria-label="Choose an hour">
            {expectedSlots(habit).map((h) => {
              const record = entries.find((entry) => entry.habitId === habit.id && entry.date === date && entry.slot === h);
              return <button key={h} aria-label={`${hourLabel(h)}: ${record ? record.value : "not reviewed"}`} aria-pressed={hour === h} className={`hour-button ${record ? "reviewed" : ""} ${hour === h ? "active" : ""}`} onClick={() => setHour(h)}><span>{hourLabel(h)}</span><strong>{record?.value ?? "—"}</strong></button>;
            })}
          </div>
          <div className="flex justify-between items-center gap-2"><h4 className="font-semibold">{hourLabel(hour)}–{hourLabel(hour + 1)}</h4><span className="hint">{value === null ? "Not reviewed" : value === 0 ? "Reviewed: zero" : `Recorded: ${value}`}</span></div>
          <RecordEditor key={`${date}-${hour}-${value}`} habit={habit} date={date} slot={hour} value={value} busy={busy} onSave={onSave} />
          <div className="form-grid review-totals">
            <div><p className="hint">Before {hourLabel(habit.reviewHour)}</p><strong>{day.before.total ?? "—"}</strong><p className="hint">{day.before.reviewed}/{day.before.expected} hours reviewed</p></div>
            <div><p className="hint">From {hourLabel(habit.reviewHour)}</p><strong>{day.after.total ?? "—"}</strong><p className="hint">{day.after.reviewed}/{day.after.expected} hours reviewed</p></div>
          </div>
        </section>}
      </>}
      <div className="week-preview">
        <div className="flex justify-between gap-2 hint mb-2"><span>Week of {formatDate(week)}</span><span>{habit.tracking === "hourly" ? "Daily totals" : "Daily records"}</span></div>
        <div className="week-grid">
          {Array.from({ length: 7 }, (_, i) => {
            const dayDate = addDays(week, i);
            const progress = dailyProgress(habit, dayDate, entries);
            const label = progress.expected === 0 ? "not started" : progress.total === null ? "not reviewed" : `${progress.total}${progress.complete ? "" : ", partial"}`;
            return <button key={dayDate} disabled={dayDate > localDate() || dayDate < habit.startDate} aria-label={`${formatDate(dayDate)}: ${label}`} aria-current={date === dayDate ? "date" : undefined} className={`week-day ${progress.met ? "met" : progress.reviewed ? "logged" : ""} ${date === dayDate ? "current" : ""}`} onClick={() => onDate(dayDate)}><span>{formatDate(dayDate, { weekday: "narrow" })}</span><strong>{progress.total ?? "—"}</strong></button>;
          })}
        </div>
        <p className="hint mt-2">— Not reviewed · 0 Reviewed zero</p>
      </div>
    </article>
  );
}

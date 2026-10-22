"use client";

import { Check, Save, Undo2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Habit } from "@/lib/types";

export type SaveRecord = (input: { habitId: string; date: string; slot: number; value: number | null }) => Promise<boolean>;

export function RecordEditor({ habit, date, slot, value, busy, onSave }: {
  habit: Habit;
  date: string;
  slot: number;
  value: number | null;
  busy: boolean;
  onSave: SaveRecord;
}) {
  const [amount, setAmount] = useState(value === null ? "" : String(value));
  const save = (next: number | null) => onSave({ habitId: habit.id, date, slot, value: next });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (amount.trim() && !busy) void save(Number(amount));
  }

  return (
    <div className="space-y-3">
      {habit.kind === "completion" ? <div className="flex gap-2">
        <button className={`button flex-1 ${value === 1 ? "primary" : "secondary"}`} aria-pressed={value === 1} disabled={busy} onClick={() => void save(1)}><Check size={17} />Mark complete</button>
        <button className={`button flex-1 ${value === 0 ? "selected-button" : "secondary"}`} aria-pressed={value === 0} disabled={busy} onClick={() => void save(0)}>Not done (0)</button>
      </div> : <form onSubmit={submit} className="record-form">
        <button className="button secondary" type="button" disabled={busy} onClick={() => void save(0)}>Review zero</button>
        <label className="sr-only" htmlFor={`amount-${habit.id}-${slot}`}>Amount for {habit.name}{slot >= 0 ? ` at ${slot}:00` : ""}</label>
        <input id={`amount-${habit.id}-${slot}`} aria-label={`Amount for ${habit.name}${slot >= 0 ? ` at ${slot}:00` : ""}`} type="number" min={0} max={1000000} step={1} required inputMode="numeric" placeholder="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={busy} />
        <button className="icon-button primary" title="Save amount" aria-label={`Save amount for ${habit.name}`} disabled={busy || !amount.trim()}><Save size={19} /></button>
      </form>}
      {value !== null && <button className="text-button" disabled={busy} onClick={() => void save(null)}><Undo2 size={14} />Clear record<span className="sr-only"> for {habit.name}</span></button>}
    </div>
  );
}

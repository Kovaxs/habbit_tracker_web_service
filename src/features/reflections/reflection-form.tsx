"use client";

import { MessageSquare, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Note } from "@/lib/types";

export function ReflectionForm({ date, note, busy, onSave }: {
  date: string;
  note?: Note;
  busy: boolean;
  onSave: (note: Note) => Promise<boolean>;
}) {
  const [helped, setHelped] = useState(note?.helped ?? "");
  const [difficult, setDifficult] = useState(note?.difficult ?? "");
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaved(await onSave({ date, helped, difficult }));
  }
  return (
    <section className="card reflections">
      <h3 className="font-semibold flex items-center gap-2"><MessageSquare size={18} />A moment to reflect</h3>
      <p className="hint mt-1">Keep a short note for this day. A blank note can stay blank.</p>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="form-grid">
          <label className="field">What helped?<textarea value={helped} onChange={(e) => { setHelped(e.target.value); setSaved(false); }} rows={3} maxLength={4000} placeholder="Something that made it easier…" disabled={busy} /></label>
          <label className="field">What was difficult?<textarea value={difficult} onChange={(e) => { setDifficult(e.target.value); setSaved(false); }} rows={3} maxLength={4000} placeholder="Something to notice for tomorrow…" disabled={busy} /></label>
        </div>
        <div className="flex gap-3 items-center"><button className="button secondary" disabled={busy}><Save size={16} />Save notes</button>{saved && <span role="status" className="hint text-forest">Notes saved</span>}</div>
      </form>
    </section>
  );
}

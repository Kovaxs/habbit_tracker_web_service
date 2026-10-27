"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Leaf, LoaderCircle, Plus, Settings2, X } from "lucide-react";
import { addProfile, createHabit, getWorkspace, saveEntry, saveNote, selectProfile, setArchived, updateHabit } from "@/server/actions";
import { HabitForm } from "@/features/habits/habit-form";
import { ProfileSwitcher } from "@/features/profiles/profile-switcher";
import { ManageView } from "@/features/habits/manage-view";
import { ProgressView } from "@/features/progress/progress-view";
import { ReflectionForm } from "@/features/reflections/reflection-form";
import { HabitCard } from "@/features/tracking/habit-card";
import { addDays, formatDate, localDate, MIN_DATE } from "@/lib/dates";
import type { Habit, Profile, Result, Snapshot, Workspace } from "@/lib/types";

type Tab = "today" | "progress" | "manage";
const tabs = [{ id: "today", label: "Today", icon: CalendarDays }, { id: "progress", label: "Progress", icon: BarChart3 }, { id: "manage", label: "Manage", icon: Settings2 }] as const;

export function TrackerApp() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<Tab>("today");
  const [date, setDate] = useState(localDate);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [editing, setEditing] = useState<Habit | "new" | null>(null);

  useEffect(() => {
    let active = true;
    getWorkspace().then((result) => {
      if (!active) return;
      if (result.ok) applyWorkspace(result.data);
      else setLoadError(result.error);
    }).catch(() => { if (active) setLoadError("Could not load your habits. Check your connection and try again."); });
    return () => { active = false; };
  }, []);

  function applyWorkspace(data: Workspace) {
    setSnapshot({ habits: data.habits, entries: data.entries, notes: data.notes });
    setProfiles(data.profiles);
    setActiveProfile(data.activeProfile);
  }
  function setWorking(value: boolean) { busyRef.current = value; setBusy(value); }
  async function changeProfile(action: () => Promise<Result<Workspace>>, message: string): Promise<string | null> {
    if (busyRef.current) return "Please wait for the current save to finish.";
    setWorking(true);
    setNotice(null);
    try {
      const result = await action();
      if (result.ok) {
        applyWorkspace(result.data);
        setEditing(null);
        setNotice({ text: message, error: false });
        return null;
      }
      setNotice({ text: result.error, error: true });
      return result.error;
    } catch {
      const error = "Could not change the profile. Check your connection and try again.";
      setNotice({ text: error, error: true });
      return error;
    } finally { setWorking(false); }
  }
  async function mutate(action: () => Promise<Result<Snapshot>>, message = ""): Promise<Result<Snapshot>> {
    if (busyRef.current) return { ok: false, error: "Please wait for the current save to finish." };
    setWorking(true);
    setNotice(null);
    try {
      const result = await action();
      if (result.ok) {
        setSnapshot(result.data);
        if (message) setNotice({ text: message, error: false });
      } else setNotice({ text: result.error, error: true });
      return result;
    } catch {
      const error = "Could not save. Your change was not confirmed. Check your connection and try again.";
      setNotice({ text: error, error: true });
      return { ok: false, error };
    } finally { setWorking(false); }
  }
  function chooseDate(next: string) { if (!busyRef.current && next >= MIN_DATE && next <= localDate()) setDate(next); }
  function chooseTab(next: Tab) { if (!busyRef.current) { setTab(next); setNotice(null); window.scrollTo({ top: 0 }); } }

  if (!snapshot || !activeProfile) return <main className="loading-screen"><h1>Habit Tracker</h1>{loadError ? <><p role="alert" className="error-box">{loadError}</p><button className="button primary" onClick={() => window.location.reload()}>Try again</button></> : <p role="status"><LoaderCircle className="spin" size={20} />Opening your workspace…</p>}</main>;

  const activeHabits = snapshot.habits.filter((habit) => !habit.archived && habit.startDate <= date);
  const now = localDate();

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="app-header">
        <div className="header-inner"><h1>Habit Tracker</h1><ProfileSwitcher profiles={profiles} activeProfile={activeProfile} busy={busy} onSwitch={id => changeProfile(() => selectProfile(id), "Profile selected.")} onCreate={name => changeProfile(() => addProfile(name), "Profile created. You can add habits now.")} /></div>
      </header>
      <nav className="app-nav" aria-label="Main navigation"><div>{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined} disabled={busy} onClick={() => chooseTab(id)}><Icon size={21} /><span>{label}</span></button>)}</div></nav>
      <main id="main-content" className="main-content">
        {tab !== "manage" && <div className="date-toolbar">
          <div><p className="eyebrow">{tab === "today" ? "ONE DAY AT A TIME" : "SMALL STEPS ADD UP"}</p><h2 className="date-heading">{date === now ? "Today" : formatDate(date, { weekday: "long" })}<span>, {formatDate(date)}</span></h2></div>
          <div className="date-controls"><div className="date-picker"><button className="icon-button" aria-label="Previous day" disabled={busy || date <= MIN_DATE} onClick={() => chooseDate(addDays(date, -1))}><ChevronLeft size={20} /></button><label className="sr-only" htmlFor="selected-date">Selected date</label><input id="selected-date" type="date" value={date} min={MIN_DATE} max={now} disabled={busy} onChange={(event) => { if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) chooseDate(event.target.value); }} /><button className="icon-button" aria-label="Next day" disabled={busy || date >= now} onClick={() => chooseDate(addDays(date, 1))}><ChevronRight size={20} /></button></div>{date !== now && <button className="text-button" disabled={busy} onClick={() => chooseDate(now)}>Back to today</button>}</div>
        </div>}
        {notice && <div className={`${notice.error ? "error-box" : "success-box"} notice`} role={notice.error ? "alert" : "status"}><span>{notice.text}</span><button className="icon-button" aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={16} /></button></div>}
        {busy && <p className="saving-status" role="status"><LoaderCircle size={15} className="spin" />Saving / processing…</p>}
        {tab === "today" && <>
          <div className="section-heading"><h2 className="text-lg!">Your daily practice <span className="muted font-normal">({activeHabits.length})</span></h2><button className="button secondary" disabled={busy} onClick={() => setEditing("new")}><Plus size={18} />Add habit</button></div>
          {activeHabits.length ? <div className="habit-grid">{activeHabits.map((habit) => <HabitCard key={`${habit.id}-${date}-${habit.startHour}-${habit.endHour}`} habit={habit} date={date} entries={snapshot.entries} busy={busy} onDate={chooseDate} onSave={async (input) => (await mutate(() => saveEntry(input, activeProfile.id), input.value === null ? "Record cleared. This period is now not reviewed." : "Record saved.")).ok} />)}</div> : <section className="card empty-state"><Leaf size={34} strokeWidth={1.5} /><h2>{snapshot.habits.length ? "A quiet day" : "Make room for a good habit"}</h2><p>{snapshot.habits.length ? "There are no active habits for this date. Choose another day, add a habit, or restore one in Manage." : "Start with one small thing, or bring your existing workbook. No perfect streaks required."}</p><div className="flex flex-wrap justify-center gap-3"><button className="button primary" disabled={busy} onClick={() => setEditing("new")}><Plus size={17} />Create your first habit</button><button className="button secondary" disabled={busy} onClick={() => chooseTab("manage")}>Import workbook</button></div></section>}
          <ReflectionForm key={`${activeProfile.id}-${date}`} date={date} note={snapshot.notes.find((note) => note.date === date)} busy={busy} onSave={async (input) => (await mutate(() => saveNote(input, activeProfile.id))).ok} />
        </>}
        {tab === "progress" && <ProgressView key={activeProfile.id} snapshot={snapshot} date={date} />}
        {tab === "manage" && <ManageView key={activeProfile.id} profileId={activeProfile.id} snapshot={snapshot} busy={busy} onBusyChange={setWorking} onAdd={() => setEditing("new")} onEdit={setEditing} onArchive={(habit) => {
          if (habit.archived || window.confirm(`Archive “${habit.name}”? Its records will stay in Progress.`)) void mutate(() => setArchived(habit.id, !habit.archived, activeProfile.id), habit.archived ? "Habit restored." : "Habit archived. Your records are kept.");
        }} onImported={(next) => setSnapshot(next)} />}
        <footer className="app-footer">A blank is not a zero. Every honest review counts.</footer>
      </main>
      {editing && <HabitForm habit={editing === "new" ? undefined : editing} startDate={date} locked={editing !== "new" && snapshot.entries.some((entry) => entry.habitId === editing.id)} onClose={() => setEditing(null)} onSave={(input) => mutate(() => editing === "new" ? createHabit(input, activeProfile.id) : updateHabit(editing.id, input, activeProfile.id), editing === "new" ? "Habit added. You can record your first review now." : "Habit updated.")} />}
    </div>
  );
}

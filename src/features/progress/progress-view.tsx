"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { addDays, formatDate, MIN_DATE, weekStart } from "@/lib/dates";
import { goalLabel, progressSummary } from "./calculations";
import type { Snapshot } from "@/lib/types";

export function ProgressView({ snapshot, date }: { snapshot: Snapshot; date: string }) {
  const [selected, setSelected] = useState(snapshot.habits.find((habit) => !habit.archived)?.id ?? snapshot.habits[0]?.id ?? "");
  const [range, setRange] = useState("week");
  const habit = snapshot.habits.find((item) => item.id === selected) ?? snapshot.habits[0];
  const start = range === "week" ? weekStart(date) : addDays(date, range === "28" ? -27 : -89);
  const from = start < MIN_DATE ? MIN_DATE : start;
  const summary = useMemo(() => habit ? progressSummary(habit, from, date, snapshot.entries) : null, [habit, from, date, snapshot.entries]);

  if (!habit || !summary) return <section className="card empty-state"><BarChart3 size={32} /><h2>Progress starts with a habit</h2><p>Add a habit, then record your first review. Your charts will appear here.</p></section>;
  const points = summary.days.map((day) => ({ ...day, label: formatDate(day.date), targetLine: day.target }));

  return (
    <div className="space-y-5">
      <div className="section-heading"><div><h2>Your progress</h2><p className="muted text-sm mt-1">An honest view of what you recorded.</p></div></div>
      <section className="card space-y-5">
        <div className="form-grid">
          <label className="field">Habit<select value={habit.id} onChange={(e) => setSelected(e.target.value)}>{snapshot.habits.map((item) => <option value={item.id} key={item.id}>{item.name}{item.archived ? " (archived)" : ""}</option>)}</select></label>
          <label className="field">Period ending on selected date<select value={range} onChange={(e) => setRange(e.target.value)}><option value="week">This week (Monday onward)</option><option value="28">Last 28 days</option><option value="90">Last 90 days</option></select></label>
        </div>
        <p className="hint">{formatDate(from, { year: "numeric", month: "short", day: "numeric" })} – {formatDate(date, { year: "numeric", month: "short", day: "numeric" })} · {goalLabel(habit)}</p>
        <div className="stats-grid">
          <div className="stat"><span>Recorded total</span><strong>{summary.total ?? "—"}</strong><small>{habit.kind === "completion" ? "completions" : habit.unit || "occurrences"}</small></div>
          <div className="stat"><span>Recording coverage</span><strong>{summary.coverage}%</strong><small>{summary.reviewed}/{summary.expected} {habit.tracking === "hourly" ? "hours" : "days"} reviewed</small></div>
          <div className="stat"><span>Target met</span><strong>{summary.metDays}<span> / {summary.completeDays}</span></strong><small>fully reviewed days</small></div>
        </div>
        <div className="chart" role="img" aria-label={`Daily recorded totals for ${habit.name}. ${summary.coverage}% coverage. Exact values are in the table below.`}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={points} margin={{ top: 15, right: 16, bottom: 5, left: -20 }} accessibilityLayer>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dce3dc" />
              <XAxis dataKey="label" minTickGap={35} tick={{ fill: "#54645c", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "#54645c", fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, "auto"]} />
              <Tooltip content={({ active, payload }) => {
                const point = payload?.[0]?.payload as (typeof points)[number] | undefined;
                return active && point ? <div className="chart-tooltip"><strong>{point.label}</strong><p>Total: {point.total ?? "Not reviewed"}</p><p>{point.reviewed}/{point.expected} reviewed</p><p>{point.complete ? point.met ? "Target met" : "Outside target" : "Partial / not reviewed"}</p></div> : null;
              }} />
              <ReferenceLine y={habit.kind === "completion" ? habit.tracking === "hourly" ? habit.endHour - habit.startHour : 1 : habit.target} stroke="#8a5b18" strokeDasharray="5 5" />
              <Line type="linear" dataKey="total" name="Recorded total" stroke="#28654b" strokeWidth={2.5} connectNulls={false} isAnimationActive={false} dot={(props) => {
                const { cx, cy, payload } = props;
                return <circle key={payload.date} cx={cx} cy={cy} r={payload.total === null ? 0 : 4} fill={payload.complete ? "#28654b" : "#fff"} stroke="#28654b" strokeWidth={2} />;
              }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-legend"><span><i className="legend-dot" />Fully reviewed</span><span><i className="legend-dot partial" />Partial</span><span><i className="legend-line" />Target</span></div>
        <p className="hint">Missing days are gaps, not zeroes. Partial totals include only recorded hours. A partial day never counts as a target met. Coverage uses the habit’s start date and current schedule, including for archived habits.</p>
        <details className="data-details"><summary>View daily values</summary><div className="table-scroll"><table><caption className="sr-only">Daily values and recording coverage</caption><thead><tr><th>Date</th><th>Total</th><th>Reviewed</th><th>Status</th></tr></thead><tbody>{summary.days.map((day) => <tr key={day.date}><td>{formatDate(day.date)}</td><td>{day.total ?? "—"}</td><td>{day.reviewed}/{day.expected}</td><td>{!day.expected ? "Not started" : !day.reviewed ? "Not reviewed" : !day.complete ? "Partial" : day.met ? "Target met" : "Reviewed"}</td></tr>)}</tbody></table></div></details>
      </section>
    </div>
  );
}

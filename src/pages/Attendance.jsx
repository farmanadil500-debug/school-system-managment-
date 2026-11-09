import React, { useMemo, useState } from "react";
import { CalendarCheck, CheckCheck, Save, Users } from "lucide-react";
import { useToast } from "../components/Toast";
import { Avatar, EmptyState, SectionHeader } from "../components/ui";
import { CLASSES, SECTIONS } from "../data/mock";

const STATUSES = {
  Present: { label: "Present", color: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-200", soft: "bg-emerald-50" },
  Absent: { label: "Absent", color: "bg-rose-500", text: "text-rose-700", ring: "ring-rose-200", soft: "bg-rose-50" },
  Late: { label: "Late", color: "bg-amber-500", text: "text-amber-700", ring: "ring-amber-200", soft: "bg-amber-50" },
};

export default function Attendance({ students }) {
  const { push } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [classFilter, setClassFilter] = useState(CLASSES[5]);
  const [section, setSection] = useState("A");
  const [marks, setMarks] = useState({});

  const roster = useMemo(
    () => students.filter((s) => s.class === classFilter && s.section === section),
    [students, classFilter, section]
  );

  const setAll = (status) => {
    const next = {};
    roster.forEach((s) => (next[s.id] = status));
    setMarks(next);
  };

  const cycle = (id) => {
    setMarks((prev) => {
      const cur = prev[id];
      const order = ["Present", "Absent", "Late"];
      const next = order[(order.indexOf(cur) + 1) % order.length] || "Present";
      return { ...prev, [id]: !cur ? "Present" : next };
    });
  };

  const counts = roster.reduce(
    (acc, s) => {
      const st = marks[s.id] || "—";
      if (st === "Present") acc.present++;
      else if (st === "Absent") acc.absent++;
      else if (st === "Late") acc.late++;
      return acc;
    },
    { present: 0, absent: 0, late: 0 }
  );

  const allMarked = roster.length > 0 && roster.every((s) => marks[s.id]);

  const save = () => {
    if (!allMarked) {
      push("Please mark all students before saving.", "warning");
      return;
    }
    push(`Attendance saved for ${classFilter}-${section} · ${counts.present} present`, "success");
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Daily Attendance"
        subtitle="Mark today's attendance with one-click status toggles"
        action={
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200">
            <CalendarCheck className="h-4 w-4 text-brand-500" />
            {date}
          </div>
        }
      />

      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Class</label>
            <select value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setMarks({}); }} className="input">
              {CLASSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Section</label>
            <select value={section} onChange={(e) => { setSection(e.target.value); setMarks({}); }} className="input">
              {SECTIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className="btn-secondary" onClick={() => setAll("Present")}><CheckCheck className="h-4 w-4 text-emerald-600" /> Mark All Present</button>
          <button className="btn-secondary" onClick={() => setAll("Absent")}>Mark All Absent</button>
          <button className="btn-ghost" onClick={() => setMarks({})}>Reset</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {roster.length === 0 ? (
          <EmptyState icon={Users} title="No students in this class" subtitle="Pick a different class or section to load the roster." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead className="bg-slate-50/70">
                <tr>
                  <th>Roll No</th>
                  <th>Student</th>
                  <th>Status</th>
                  <th className="text-right">Quick Toggle</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => {
                  const st = marks[s.id];
                  const cfg = st ? STATUSES[st] : null;
                  return (
                    <tr key={s.id}>
                      <td><span className="font-mono text-slate-600">#{s.rollNo}</span></td>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={s.name} size="sm" />
                          <span className="font-medium text-slate-800">{s.name}</span>
                        </div>
                      </td>
                      <td>
                        {cfg ? (
                          <span className={`badge ${cfg.soft} ${cfg.text} ring-1 ${cfg.ring}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.color}`} /> {cfg.label}
                          </span>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-500">Not marked</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          {Object.values(STATUSES).map((opt) => {
                            const active = st === opt.label;
                            return (
                              <button
                                key={opt.label}
                                onClick={() => setMarks((p) => ({ ...p, [s.id]: opt.label }))}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                  active ? `${opt.color} text-white shadow-sm` : `bg-slate-100 ${opt.text} hover:bg-slate-200`
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {roster.length > 0 && (
        <div className="card sticky bottom-4 z-10 flex flex-col items-stretch gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-slate-700">Summary:</span>
            <span className="badge bg-slate-100 text-slate-700">Total: {roster.length}</span>
            <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Present: {counts.present}</span>
            <span className="badge bg-rose-50 text-rose-700 ring-1 ring-rose-200">Absent: {counts.absent}</span>
            <span className="badge bg-amber-50 text-amber-700 ring-1 ring-amber-200">Late: {counts.late}</span>
          </div>
          <button className="btn-primary" onClick={save}>
            <Save className="h-4 w-4" /> Save Attendance
          </button>
        </div>
      )}
    </div>
  );
}

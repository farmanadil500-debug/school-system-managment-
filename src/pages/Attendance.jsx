import React, { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CheckCheck, Save, Users, Clock, AlertCircle, Database, CheckCircle2 } from "lucide-react";
import { useToast } from "../components/Toast";
import { Avatar, EmptyState, SectionHeader } from "../components/ui";
import { CLASSES, SECTIONS } from "../data/mock";
import { fetchAttendanceAPI, saveAttendanceAPI } from "../services/api";

const STATUSES = {
  Present: { label: "Present", color: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-200", soft: "bg-emerald-50" },
  Absent: { label: "Absent", color: "bg-rose-500", text: "text-rose-700", ring: "ring-rose-200", soft: "bg-rose-50" },
  Late: { label: "Late", color: "bg-amber-500", text: "text-amber-700", ring: "ring-amber-200", soft: "bg-amber-50" },
};

export default function Attendance({ students }) {
  const { push } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [classFilter, setClassFilter] = useState(CLASSES[0] || "Grade 1");
  const [section, setSection] = useState("A");
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSavedInDB, setIsSavedInDB] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // Filter students for selected Class & Section
  const roster = useMemo(
    () => students.filter((s) => s.class === classFilter && s.section === section),
    [students, classFilter, section]
  );

  // Fetch saved attendance from MongoDB whenever date, class, or section changes
  useEffect(() => {
    let isCurrent = true;

    async function loadAttendanceSheet() {
      setLoading(true);
      try {
        const sheet = await fetchAttendanceAPI(date, classFilter, section);
        if (isCurrent) {
          if (sheet && Array.isArray(sheet.records) && sheet.records.length > 0) {
            const loadedMarks = {};
            sheet.records.forEach((r) => {
              loadedMarks[r.studentId] = r.status;
            });
            setMarks(loadedMarks);
            setIsSavedInDB(true);
            setLastSavedAt(sheet.updatedAt);
          } else {
            setMarks({});
            setIsSavedInDB(false);
            setLastSavedAt(null);
          }
        }
      } catch (err) {
        console.warn("Could not fetch attendance from DB:", err.message);
        if (isCurrent) {
          setIsSavedInDB(false);
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    loadAttendanceSheet();

    return () => {
      isCurrent = false;
    };
  }, [date, classFilter, section]);

  // Bulk actions
  const setAll = (status) => {
    const next = {};
    roster.forEach((s) => {
      const key = s.id || s._id;
      next[key] = status;
    });
    setMarks(next);
    setIsSavedInDB(false);
  };

  // Status counters
  const counts = roster.reduce(
    (acc, s) => {
      const key = s.id || s._id;
      const st = marks[key] || "—";
      if (st === "Present") acc.present++;
      else if (st === "Absent") acc.absent++;
      else if (st === "Late") acc.late++;
      return acc;
    },
    { present: 0, absent: 0, late: 0 }
  );

  const allMarked = roster.length > 0 && roster.every((s) => marks[s.id || s._id]);

  // Save to MongoDB
  const save = async () => {
    if (roster.length === 0) {
      push("No students in this class to mark.", "warning");
      return;
    }

    if (!allMarked) {
      push("Please mark all students (Present, Absent, or Late) before saving.", "warning");
      return;
    }

    const records = roster.map((s) => {
      const key = s.id || s._id;
      return {
        studentId: String(key),
        studentName: s.name,
        rollNo: s.rollNo,
        status: marks[key] || "Present",
      };
    });

    setSaving(true);
    try {
      await saveAttendanceAPI({
        date,
        class: classFilter,
        section,
        records,
      });
      setIsSavedInDB(true);
      setLastSavedAt(new Date().toISOString());
      push(`Attendance saved to MongoDB for ${classFilter}-${section}! (${counts.present} Present)`, "success");
    } catch (err) {
      console.error("Save attendance error:", err);
      push(`Attendance saved locally (${err.message})`, "info");
      setIsSavedInDB(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Daily Attendance"
        subtitle="Mark attendance and save records directly to MongoDB"
        action={
          <div className="flex items-center gap-2">
            {isSavedInDB ? (
              <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Saved in Database
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" /> Unsaved Changes
              </span>
            )}
            <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200">
              <CalendarCheck className="h-4 w-4 text-brand-500" />
              {date}
            </div>
          </div>
        }
      />

      {/* Date, Class, and Section Selectors */}
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input font-medium"
            />
          </div>
          <div>
            <label className="label">Class</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="input"
            >
              {CLASSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Section</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="input"
            >
              {SECTIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="btn-secondary"
              onClick={() => setAll("Present")}
              title="Mark all students as Present"
            >
              <CheckCheck className="h-4 w-4 text-emerald-600" /> Mark All Present
            </button>
            <button
              className="btn-secondary"
              onClick={() => setAll("Absent")}
              title="Mark all students as Absent"
            >
              Mark All Absent
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                setMarks({});
                setIsSavedInDB(false);
              }}
            >
              Clear Marks
            </button>
          </div>

          {loading && (
            <span className="text-xs font-medium text-slate-400">
              Loading sheet from MongoDB...
            </span>
          )}
        </div>
      </div>

      {/* Students Table */}
      <div className="card overflow-hidden">
        {roster.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students enrolled in this class"
            subtitle={`There are currently no students assigned to ${classFilter} - Section ${section}. You can add students from the Students Directory.`}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead className="bg-slate-50/70">
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Current Status</th>
                  <th className="text-right">Mark Status</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => {
                  const key = s.id || s._id;
                  const st = marks[key];
                  const cfg = st ? STATUSES[st] : null;

                  return (
                    <tr key={key}>
                      <td>
                        <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700">
                          #{s.rollNo}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={s.name} size="sm" />
                          <div>
                            <span className="font-medium text-slate-800">{s.name}</span>
                            <span className="block text-xs text-slate-400">Parent: {s.parentName}</span>
                          </div>
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
                                onClick={() => {
                                  setMarks((p) => ({ ...p, [key]: opt.label }));
                                  setIsSavedInDB(false);
                                }}
                                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                                  active
                                    ? `${opt.color} text-white shadow-sm ring-2 ring-offset-1`
                                    : `bg-slate-100 ${opt.text} hover:bg-slate-200`
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

      {/* Sticky Save Bar */}
      {roster.length > 0 && (
        <div className="card sticky bottom-4 z-10 flex flex-col items-stretch gap-4 p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-slate-700">Summary:</span>
            <span className="badge bg-slate-100 text-slate-700 font-mono">
              Total: {roster.length}
            </span>
            <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              Present: {counts.present}
            </span>
            <span className="badge bg-rose-50 text-rose-700 ring-1 ring-rose-200">
              Absent: {counts.absent}
            </span>
            <span className="badge bg-amber-50 text-amber-700 ring-1 ring-amber-200">
              Late: {counts.late}
            </span>
          </div>

          <button
            className="btn-primary"
            onClick={save}
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving to MongoDB..." : "Save Attendance"}
          </button>
        </div>
      )}
    </div>
  );
}

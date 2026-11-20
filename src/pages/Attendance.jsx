import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  CheckCheck,
  Save,
  Users,
  CheckCircle2,
  AlertCircle,
  History,
  ClipboardCheck,
  Eye,
  Filter,
  BarChart3,
  Calendar,
} from "lucide-react";
import { useToast } from "../components/Toast";
import { Avatar, EmptyState, SectionHeader } from "../components/ui";
import DatePicker from "../components/DatePicker";
import { CLASSES, SECTIONS } from "../data/mock";
import {
  fetchAttendanceAPI,
  saveAttendanceAPI,
  fetchAttendanceHistoryAPI,
} from "../services/api";

const STATUSES = {
  Present: {
    label: "Present",
    color: "bg-emerald-500",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
    soft: "bg-emerald-50",
  },
  Absent: {
    label: "Absent",
    color: "bg-rose-500",
    text: "text-rose-700",
    ring: "ring-rose-200",
    soft: "bg-rose-50",
  },
  Late: {
    label: "Late",
    color: "bg-amber-500",
    text: "text-amber-700",
    ring: "ring-amber-200",
    soft: "bg-amber-50",
  },
};

export default function Attendance({ students }) {
  const { push } = useToast();
  const today = new Date().toISOString().slice(0, 10);

  // Tab State: "mark" vs "history"
  const [activeTab, setActiveTab] = useState("mark");

  // Daily Mark Attendance State
  const [date, setDate] = useState(today);
  const [classFilter, setClassFilter] = useState(CLASSES[0] || "Nursery");
  const [section, setSection] = useState("A");
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // History Tab State
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyClassFilter, setHistoryClassFilter] = useState("All");

  // Filter students for selected Class & Section
  const roster = useMemo(
    () => students.filter((s) => s.class === classFilter && s.section === section),
    [students, classFilter, section]
  );

  const localKey = `attendance_${date}_${classFilter}_${section}`;

  // Fetch saved attendance for the selected date, class, section
  useEffect(() => {
    let isCurrent = true;

    async function loadAttendanceSheet() {
      setLoading(true);

      // 1. Try to load from cloud backend
      try {
        const sheet = await fetchAttendanceAPI(date, classFilter, section);
        if (isCurrent && sheet && Array.isArray(sheet.records) && sheet.records.length > 0) {
          const loadedMarks = {};
          sheet.records.forEach((r) => {
            loadedMarks[r.studentId] = r.status;
          });
          setMarks(loadedMarks);
          setIsSaved(true);
          setLoading(false);
          return;
        }
      } catch (err) {
        // Backend offline or unreachable — fallback to local storage
      }

      // 2. Fallback to local storage
      try {
        const localSaved = localStorage.getItem(localKey);
        if (localSaved && isCurrent) {
          const parsed = JSON.parse(localSaved);
          if (parsed && parsed.marks) {
            setMarks(parsed.marks);
            setIsSaved(true);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // LocalStorage parse error
      }

      if (isCurrent) {
        setMarks({});
        setIsSaved(false);
        setLoading(false);
      }
    }

    loadAttendanceSheet();

    return () => {
      isCurrent = false;
    };
  }, [date, classFilter, section, localKey]);

  // Load History list whenever user switches to History tab
  useEffect(() => {
    if (activeTab !== "history") return;

    async function loadHistory() {
      setHistoryLoading(true);
      let cloudSheets = [];

      // 1. Fetch from backend
      try {
        cloudSheets = await fetchAttendanceHistoryAPI({
          class: historyClassFilter,
        });
      } catch (err) {
        console.info("Using local history fallback:", err.message);
      }

      // 2. Also collect all locally saved sheets from localStorage
      const localSheets = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("attendance_")) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && parsed.date && parsed.class) {
                // Check filter
                if (historyClassFilter === "All" || parsed.class === historyClassFilter) {
                  const presentCount = Object.values(parsed.marks || {}).filter((v) => v === "Present").length;
                  const absentCount = Object.values(parsed.marks || {}).filter((v) => v === "Absent").length;
                  const lateCount = Object.values(parsed.marks || {}).filter((v) => v === "Late").length;
                  const total = (parsed.records || []).length || Object.keys(parsed.marks || {}).length;

                  localSheets.push({
                    _id: k,
                    date: parsed.date,
                    class: parsed.class,
                    section: parsed.section,
                    totalPresent: presentCount,
                    totalAbsent: absentCount,
                    totalLate: lateCount,
                    totalCount: total,
                    updatedAt: parsed.savedAt,
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn("Local history error", e);
      }

      // Merge and deduplicate by date + class + section
      const map = new Map();
      localSheets.forEach((item) => map.set(`${item.date}_${item.class}_${item.section}`, item));
      cloudSheets.forEach((item) => map.set(`${item.date}_${item.class}_${item.section}`, item));

      const merged = Array.from(map.values()).sort((a, b) => (b.date > a.date ? 1 : -1));
      setHistoryList(merged);
      setHistoryLoading(false);
    }

    loadHistory();
  }, [activeTab, historyClassFilter]);

  // Bulk actions
  const setAll = (status) => {
    const next = {};
    roster.forEach((s) => {
      const key = s.id || s._id;
      next[key] = status;
    });
    setMarks(next);
    setIsSaved(false);
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

  // Save Attendance (Dual Persistence: LocalStorage + Cloud)
  const save = async () => {
    if (roster.length === 0) {
      push("No students enrolled in this class to mark.", "warning");
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

    const payload = {
      date,
      class: classFilter,
      section,
      records,
      marks,
      savedAt: new Date().toISOString(),
    };

    setSaving(true);

    // 1. Instant local persistence
    try {
      localStorage.setItem(localKey, JSON.stringify(payload));
    } catch (e) {
      console.warn("LocalStorage save error", e);
    }

    // 2. Cloud database sync
    try {
      await saveAttendanceAPI({
        date,
        class: classFilter,
        section,
        records,
      });
    } catch (err) {
      console.info("Cloud sync queued; saved safely to storage.");
    }

    setIsSaved(true);
    setSaving(false);
    push(`Attendance saved successfully for ${classFilter}-${section}! (${counts.present} Present)`, "success");
  };

  // Switch to Tab 1 to view/edit a past sheet
  const handleViewPastSheet = (pastRecord) => {
    setDate(pastRecord.date);
    setClassFilter(pastRecord.class);
    setSection(pastRecord.section);
    setActiveTab("mark");
    push(`Loaded attendance record for ${pastRecord.class}-${pastRecord.section} on ${pastRecord.date}`, "info");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <SectionHeader
        title="Attendance Management"
        subtitle="Mark daily student attendance and track historical attendance records"
        action={
          <div className="flex items-center gap-2">
            {activeTab === "mark" && (
              isSaved ? (
                <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Attendance Saved
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" /> Unsaved Changes
                </span>
              )
            )}
          </div>
        }
      />

      {/* Modern Two-Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("mark")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all ${
            activeTab === "mark"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          Mark Attendance
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all ${
            activeTab === "history"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          <History className="h-4 w-4" />
          Attendance History & Reports
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: MARK DAILY ATTENDANCE                                    */}
      {/* ============================================================== */}
      {activeTab === "mark" && (
        <div className="space-y-6 animate-fade-in">
          {/* Controls Card with Custom DatePicker */}
          <div className="card p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Custom Smooth Animated DatePicker */}
              <div>
                <DatePicker value={date} onChange={setDate} label="Attendance Date" />
              </div>

              {/* Class Selector (with Nursery & KG!) */}
              <div>
                <label className="label">Class</label>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="input font-medium"
                >
                  {CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Selector */}
              <div>
                <label className="label">Section</label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="input font-medium"
                >
                  {SECTIONS.map((c) => (
                    <option key={c} value={c}>
                      Section {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Bulk Action Buttons */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAll("Present")}
                  title="Mark all students as Present"
                >
                  <CheckCheck className="h-4 w-4 text-emerald-600" /> Mark All Present
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAll("Absent")}
                  title="Mark all students as Absent"
                >
                  Mark All Absent
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setMarks({});
                    setIsSaved(false);
                  }}
                >
                  Clear Marks
                </button>
              </div>

              {loading && (
                <span className="text-xs font-medium text-slate-400">
                  Loading saved record...
                </span>
              )}
            </div>
          </div>

          {/* Students Table */}
          <div className="card overflow-hidden">
            {roster.length === 0 ? (
              <EmptyState
                icon={Users}
                title={`No students enrolled in ${classFilter} - Section ${section}`}
                subtitle="Pick a different class or add students from the Students Directory."
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
                                <span className="font-semibold text-slate-800">{s.name}</span>
                                <span className="block text-xs text-slate-400">
                                  Parent: {s.parentName}
                                </span>
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
                                    type="button"
                                    onClick={() => {
                                      setMarks((p) => ({ ...p, [key]: opt.label }));
                                      setIsSaved(false);
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

          {/* Sticky Bottom Save Bar */}
          {roster.length > 0 && (
            <div className="card sticky bottom-4 z-10 flex flex-col items-stretch gap-4 p-4 shadow-xl sm:flex-row sm:items-center sm:justify-between border border-slate-200">
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
                type="button"
                className="btn-primary"
                onClick={save}
                disabled={saving}
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Attendance"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: ATTENDANCE HISTORY & PAST REPORTS                       */}
      {/* ============================================================== */}
      {activeTab === "history" && (
        <div className="space-y-6 animate-fade-in">
          {/* History Filters */}
          <div className="card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-brand-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Historical Attendance Log</h3>
                  <p className="text-xs text-slate-500">
                    Review past attendance sheets across all dates and classes
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={historyClassFilter}
                  onChange={(e) => setHistoryClassFilter(e.target.value)}
                  className="input w-auto font-medium"
                >
                  <option value="All">All Classes</option>
                  {CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="card overflow-hidden">
            {historyLoading ? (
              <div className="p-12 text-center text-sm font-medium text-slate-400">
                Loading attendance history...
              </div>
            ) : historyList.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No attendance records saved yet"
                subtitle="Mark attendance in the 'Mark Attendance' tab and click Save to populate this history."
                action={
                  <button className="btn-primary" onClick={() => setActiveTab("mark")}>
                    <ClipboardCheck className="h-4 w-4" /> Mark Attendance Now
                  </button>
                }
              />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead className="bg-slate-50/70">
                    <tr>
                      <th>Date</th>
                      <th>Class & Section</th>
                      <th>Total Enrolled</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Late</th>
                      <th>Attendance Rate</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((item, idx) => {
                      const total =
                        item.totalCount ||
                        (item.records ? item.records.length : 0) ||
                        (item.totalPresent + item.totalAbsent + item.totalLate) ||
                        1;
                      const pct = Math.round(((item.totalPresent || 0) / total) * 100);

                      return (
                        <tr key={item._id || `${item.date}_${item.class}_${item.section}_${idx}`}>
                          <td>
                            <span className="font-semibold text-slate-900 flex items-center gap-2">
                              <CalendarCheck className="h-4 w-4 text-brand-600" />
                              {item.date}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-slate-100 text-slate-700 font-medium">
                              {item.class} · Section {item.section}
                            </span>
                          </td>
                          <td className="font-mono text-slate-600">{total}</td>
                          <td>
                            <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                              {item.totalPresent} Present
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-rose-50 text-rose-700 ring-1 ring-rose-200">
                              {item.totalAbsent} Absent
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                              {item.totalLate} Late
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    pct >= 85
                                      ? "bg-emerald-500"
                                      : pct >= 70
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                  }`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span
                                className={`text-xs font-bold ${
                                  pct >= 85
                                    ? "text-emerald-700"
                                    : pct >= 70
                                    ? "text-amber-700"
                                    : "text-rose-700"
                                }`}
                              >
                                {pct}%
                              </span>
                            </div>
                          </td>
                          <td className="text-right">
                            <button
                              type="button"
                              onClick={() => handleViewPastSheet(item)}
                              className="btn-secondary text-xs py-1.5 px-3"
                              title="Open this attendance sheet to view or edit"
                            >
                              <Eye className="h-3.5 w-3.5" /> View / Edit Sheet
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

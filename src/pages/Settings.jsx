import React, { useState, useEffect } from "react";
import {
  School,
  Calendar,
  Layers,
  BookOpen,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "../lib/api-client";
import { useToast } from "../components/Toast";
import { useAuth } from "../lib/auth-context";
import { can } from "../lib/permissions";

export default function Settings() {
  const { push } = useToast();
  const { user } = useAuth();
  const isAuthorized = can(user, "school:update");

  const [activeTab, setActiveTab] = useState("profile"); // profile | years | classes | subjects
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // School Profile & Settings State
  const [schoolData, setSchoolData] = useState({
    name: "Apex International School",
    code: "APEX",
    phone: "",
    address: "",
    settings: {
      currency: "PKR",
      timezone: "Asia/Karachi",
      gradingScheme: "standard",
      feeDueDay: 10,
      lateFine: 500,
      attendanceEditDays: 2,
    },
  });

  // Academic Years State
  const [years, setYears] = useState([]);
  const [createYearOpen, setCreateYearOpen] = useState(false);

  // Classes & Sections State
  const [classes, setClasses] = useState([]);
  const [createClassOpen, setCreateClassOpen] = useState(false);
  const [createSectionOpen, setCreateSectionOpen] = useState(null); // classId when open

  // Subjects State
  const [subjects, setSubjects] = useState([]);
  const [createSubjectOpen, setCreateSubjectOpen] = useState(false);

  // Initial load
  useEffect(() => {
    async function loadAllData() {
      setIsLoading(true);
      try {
        const [schoolRes, yearsRes, classesRes, subjectsRes] = await Promise.allSettled([
          apiFetch("/api/v1/school"),
          apiFetch("/api/v1/academic/years"),
          apiFetch("/api/v1/academic/classes"),
          apiFetch("/api/v1/academic/subjects"),
        ]);

        if (schoolRes.status === "fulfilled" && schoolRes.value?.data) {
          setSchoolData(schoolRes.value.data);
        }
        if (yearsRes.status === "fulfilled" && yearsRes.value?.data) {
          setYears(yearsRes.value.data);
        }
        if (classesRes.status === "fulfilled" && classesRes.value?.data) {
          setClasses(classesRes.value.data);
        }
        if (subjectsRes.status === "fulfilled" && subjectsRes.value?.data) {
          setSubjects(subjectsRes.value.data);
        }
      } catch (_e) {
        // Fallback gracefully
      } finally {
        setIsLoading(false);
      }
    }

    loadAllData();
  }, []);

  // Save School Settings
  const handleSaveSchool = async () => {
    if (!isAuthorized) return;
    setIsSaving(true);
    try {
      await apiFetch("/api/v1/school", {
        method: "PATCH",
        body: JSON.stringify({
          name: schoolData.name,
          phone: schoolData.phone,
          address: schoolData.address,
          settings: schoolData.settings,
        }),
      });
      push("School settings updated successfully!", "success");
    } catch (err) {
      push(err.message || "Failed to update school settings", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Reload Academic Years
  const reloadYears = async () => {
    try {
      const res = await apiFetch("/api/v1/academic/years");
      if (res?.data) setYears(res.data);
    } catch (_e) {
      // Ignored
    }
  };

  // Reload Classes
  const reloadClasses = async () => {
    try {
      const res = await apiFetch("/api/v1/academic/classes");
      if (res?.data) setClasses(res.data);
    } catch (_e) {
      // Ignored
    }
  };

  // Reload Subjects
  const reloadSubjects = async () => {
    try {
      const res = await apiFetch("/api/v1/academic/subjects");
      if (res?.data) setSubjects(res.data);
    } catch (_e) {
      // Ignored
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="mt-3 text-sm text-slate-500">Loading academic structure & settings…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Academic Setup & Settings
          </h1>
          <p className="text-sm text-slate-500">
            Configure school parameters, academic sessions, grade levels, sections, and curriculum
          </p>
        </div>

        {activeTab === "profile" && isAuthorized && (
          <button
            onClick={handleSaveSchool}
            disabled={isSaving}
            className="btn-primary self-start sm:self-auto"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "profile"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <School className="h-4 w-4" />
          School Profile & Rules
        </button>

        <button
          onClick={() => setActiveTab("years")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "years"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Academic Sessions ({years.length})
        </button>

        <button
          onClick={() => setActiveTab("classes")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "classes"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="h-4 w-4" />
          Classes & Sections ({classes.length})
        </button>

        <button
          onClick={() => setActiveTab("subjects")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "subjects"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Subjects Catalog ({subjects.length})
        </button>
      </div>

      {/* Tab 1: School Profile & Rules */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* General Information */}
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800">General Information</h3>
            <div>
              <label className="label">School Official Name</label>
              <input
                className="input"
                disabled={!isAuthorized}
                value={schoolData.name || ""}
                onChange={(e) => setSchoolData({ ...schoolData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Institution Code</label>
              <input
                className="input bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                disabled
                value={schoolData.code || "APEX"}
              />
            </div>
            <div>
              <label className="label">Contact Telephone</label>
              <input
                className="input"
                disabled={!isAuthorized}
                placeholder="+92 300 1234567"
                value={schoolData.phone || ""}
                onChange={(e) => setSchoolData({ ...schoolData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Campus Address</label>
              <textarea
                rows={3}
                className="input"
                disabled={!isAuthorized}
                placeholder="Campus address…"
                value={schoolData.address || ""}
                onChange={(e) => setSchoolData({ ...schoolData, address: e.target.value })}
              />
            </div>
          </div>

          {/* Academic & Financial Rules */}
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800">Operational & Fee Rules</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">System Currency</label>
                <input
                  className="input"
                  disabled={!isAuthorized}
                  value={schoolData.settings?.currency || "PKR"}
                  onChange={(e) =>
                    setSchoolData({
                      ...schoolData,
                      settings: { ...schoolData.settings, currency: e.target.value },
                    })
                  }
                />
              </div>

              <div>
                <label className="label">School Timezone</label>
                <input
                  className="input"
                  disabled={!isAuthorized}
                  value={schoolData.settings?.timezone || "Asia/Karachi"}
                  onChange={(e) =>
                    setSchoolData({
                      ...schoolData,
                      settings: { ...schoolData.settings, timezone: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Monthly Fee Due Day</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  className="input"
                  disabled={!isAuthorized}
                  value={schoolData.settings?.feeDueDay ?? 10}
                  onChange={(e) =>
                    setSchoolData({
                      ...schoolData,
                      settings: { ...schoolData.settings, feeDueDay: Number(e.target.value) },
                    })
                  }
                />
                <p className="mt-1 text-[11px] text-slate-400">Day of the month (e.g. 10th)</p>
              </div>

              <div>
                <label className="label">Late Payment Fine (PKR)</label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  className="input"
                  disabled={!isAuthorized}
                  value={schoolData.settings?.lateFine ?? 500}
                  onChange={(e) =>
                    setSchoolData({
                      ...schoolData,
                      settings: { ...schoolData.settings, lateFine: Number(e.target.value) },
                    })
                  }
                />
                <p className="mt-1 text-[11px] text-slate-400">Fixed penalty applied after due date</p>
              </div>
            </div>

            <div>
              <label className="label">Attendance Edit Window for Teachers</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={14}
                  className="input w-28"
                  disabled={!isAuthorized}
                  value={schoolData.settings?.attendanceEditDays ?? 2}
                  onChange={(e) =>
                    setSchoolData({
                      ...schoolData,
                      settings: { ...schoolData.settings, attendanceEditDays: Number(e.target.value) },
                    })
                  }
                />
                <span className="text-sm font-medium text-slate-600">
                  days back allowed (default: today + 2 previous days)
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Older dates require Administrator override and generate an audit trail
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Academic Years */}
      {activeTab === "years" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Only one session can be marked as <span className="font-semibold text-brand-600">Current</span> at any time.
            </p>
            {isAuthorized && (
              <button onClick={() => setCreateYearOpen(true)} className="btn-primary">
                <Plus className="h-4 w-4" /> Add Academic Year
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {years.map((y) => (
              <div
                key={y._id}
                className={`card p-5 transition ${
                  y.isCurrent
                    ? "ring-2 ring-brand-500 shadow-md bg-gradient-to-br from-white to-brand-50/20 dark:from-slate-900 dark:to-indigo-950/40"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{y.name}</h4>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(y.startDate).toLocaleDateString()} – {new Date(y.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  {y.isCurrent ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:bg-slate-800 dark:text-brand-300 dark:ring-1 dark:ring-slate-700">
                      <CheckCircle2 className="h-3 w-3" /> Current
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Archived</span>
                  )}
                </div>

                {y.terms && y.terms.length > 0 && (
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">Academic Terms:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {y.terms.map((t, i) => (
                        <span
                          key={i}
                          className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {createYearOpen && (
            <CreateYearModal
              onClose={() => setCreateYearOpen(false)}
              onSuccess={() => {
                setCreateYearOpen(false);
                reloadYears();
                push("Academic session created successfully", "success");
              }}
            />
          )}
        </div>
      )}

      {/* Tab 3: Classes & Sections */}
      {activeTab === "classes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Grade levels and sections configured for enrollments and attendance.
            </p>
            {isAuthorized && (
              <button onClick={() => setCreateClassOpen(true)} className="btn-primary">
                <Plus className="h-4 w-4" /> Add Grade Level
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <div key={cls._id} className="card p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{cls.name}</h4>
                    <p className="text-xs text-slate-400">Sequence Order: {cls.order}</p>
                  </div>
                  {isAuthorized && (
                    <button
                      onClick={() => setCreateSectionOpen(cls._id)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-700 transition"
                    >
                      + Section
                    </button>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">Sections:</p>
                  {cls.sections && cls.sections.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {cls.sections.map((sec) => (
                        <div
                          key={sec._id}
                          className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200/60"
                        >
                          <span className="font-bold text-xs text-slate-800">Sec {sec.name}</span>
                          <span className="text-[10px] text-slate-400">({sec.capacity} seats)</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400">No sections added yet</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {createClassOpen && (
            <CreateClassModal
              onClose={() => setCreateClassOpen(false)}
              onSuccess={() => {
                setCreateClassOpen(false);
                reloadClasses();
                push("Class added successfully", "success");
              }}
            />
          )}

          {createSectionOpen && (
            <CreateSectionModal
              classId={createSectionOpen}
              onClose={() => setCreateSectionOpen(null)}
              onSuccess={() => {
                setCreateSectionOpen(null);
                reloadClasses();
                push("Section added successfully", "success");
              }}
            />
          )}
        </div>
      )}

      {/* Tab 4: Subjects Catalog */}
      {activeTab === "subjects" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Curriculum subjects catalog used across teaching assignments and exam results.
            </p>
            {isAuthorized && (
              <button onClick={() => setCreateSubjectOpen(true)} className="btn-primary">
                <Plus className="h-4 w-4" /> Add Subject
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-5 py-3">Subject Name</th>
                  <th className="px-5 py-3">Subject Code</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-xs text-slate-400">
                      No subjects configured yet
                    </td>
                  </tr>
                ) : (
                  subjects.map((sub) => (
                    <tr key={sub._id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 font-semibold text-slate-800">{sub.name}</td>
                      <td className="px-5 py-3">
                        <span className="font-mono rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                          {sub.code}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {isAuthorized && (
                          <button
                            onClick={async () => {
                              if (confirm(`Delete subject "${sub.name}"?`)) {
                                try {
                                  await apiFetch(`/api/v1/academic/subjects/${sub._id}`, { method: "DELETE" });
                                  reloadSubjects();
                                  push("Subject deleted", "info");
                                } catch (e) {
                                  push(e.message, "error");
                                }
                              }
                            }}
                            className="text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {createSubjectOpen && (
            <CreateSubjectModal
              onClose={() => setCreateSubjectOpen(false)}
              onSuccess={() => {
                setCreateSubjectOpen(false);
                reloadSubjects();
                push("Subject added to catalog", "success");
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Modals ──────────────────────────────────────────────────────────────────

function CreateYearModal({ onClose, onSuccess }) {
  const [name, setName] = useState("2026-2027");
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2027-06-30");
  const [isCurrent, setIsCurrent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await apiFetch("/api/v1/academic/years", {
        method: "POST",
        body: JSON.stringify({
          name,
          startDate,
          endDate,
          isCurrent,
          terms: [
            { name: "Term 1", startDate: "2026-08-01", endDate: "2026-12-20" },
            { name: "Term 2", startDate: "2027-01-05", endDate: "2027-06-30" },
          ],
        }),
      });
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to create academic session");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-bold text-slate-900">Add Academic Session</h3>
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="label">Session Name (e.g. 2026-2027)</label>
            <input required className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" required className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" required className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="current" checked={isCurrent} onChange={(e) => setIsCurrent(e.target.checked)} className="rounded" />
            <label htmlFor="current" className="text-xs font-semibold text-slate-700">Set as Current Active Session</label>
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? "Saving…" : "Save Session"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateClassModal({ onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [order, setOrder] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await apiFetch("/api/v1/academic/classes", {
        method: "POST",
        body: JSON.stringify({ name, order: Number(order) }),
      });
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to add class");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-bold text-slate-900">Add Grade Level / Class</h3>
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="label">Class Name (e.g. Grade 1, Nursery, KG)</label>
            <input required placeholder="Grade 1" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Order / Sequence Number</label>
            <input type="number" min={1} required className="input" value={order} onChange={(e) => setOrder(e.target.value)} />
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? "Adding…" : "Add Class"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateSectionModal({ classId, onClose, onSuccess }) {
  const [name, setName] = useState("A");
  const [capacity, setCapacity] = useState(40);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await apiFetch("/api/v1/academic/sections", {
        method: "POST",
        body: JSON.stringify({ classId, name, capacity: Number(capacity) }),
      });
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to add section");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-bold text-slate-900">Add Section</h3>
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="label">Section Letter/Name (e.g. A, B, Rose)</label>
            <input required placeholder="A" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Student Capacity</label>
            <input type="number" min={1} max={200} required className="input" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? "Adding…" : "Add Section"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateSubjectModal({ onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await apiFetch("/api/v1/academic/subjects", {
        method: "POST",
        body: JSON.stringify({ name, code: code.toUpperCase() }),
      });
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to add subject");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-bold text-slate-900">Add Subject</h3>
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="label">Subject Name (e.g. Mathematics)</label>
            <input required placeholder="Mathematics" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Subject Code (e.g. MATH)</label>
            <input required placeholder="MATH" className="input font-mono" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? "Adding…" : "Add Subject"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

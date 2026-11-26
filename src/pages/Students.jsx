import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Users,
  Filter,
  Phone,
  Download,
  Printer,
  Loader2,
  AlertCircle,
  GraduationCap,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { Avatar, EmptyState, SectionHeader, StatusBadge } from "../components/ui";
import { apiFetch } from "../lib/api-client";
import {
  fetchStudentsAPI,
  admitStudentAPI,
  updateStudentAPI,
  getStudentByIdAPI,
  promoteStudentsAPI,
  downloadStudentsCSVAPI,
} from "../lib/students-api";
import { useAuth } from "../lib/auth-context";
import { can, ROLES } from "../lib/permissions";

export default function Students({ globalQuery, openAdd, onCloseAdd, onView }) {
  const { push } = useToast();
  const { user } = useAuth();
  const canManage = can(user, "students:write");

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [currentYear, setCurrentYear] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("All");
  const [selectedSectionId, setSelectedSectionId] = useState("All");

  // Selected students for bulk promotion
  const [selectedIds, setSelectedIds] = useState([]);
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState(null);

  // Load Classes & Academic Years once
  useEffect(() => {
    async function loadMeta() {
      try {
        const [clsRes, yearsRes] = await Promise.allSettled([
          apiFetch("/api/v1/academic/classes"),
          apiFetch("/api/v1/academic/years"),
        ]);

        if (clsRes.status === "fulfilled" && clsRes.value?.data) {
          setClasses(clsRes.value.data);
        }
        if (yearsRes.status === "fulfilled" && yearsRes.value?.data) {
          setAcademicYears(yearsRes.value.data);
          const activeY = yearsRes.value.data.find((y) => y.isCurrent);
          if (activeY) setCurrentYear(activeY);
        }
      } catch (_e) {
        // Fallback
      }
    }
    loadMeta();
  }, []);

  // Load Students
  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const res = await fetchStudentsAPI({
        classId: selectedClassId,
        sectionId: selectedSectionId,
        q: globalQuery || search,
      });

      if (res?.data) {
        setStudents(res.data);
      }
    } catch (err) {
      push(err.message || "Failed to load students", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [selectedClassId, selectedSectionId, globalQuery]);

  // Derived sections based on selected class filter
  const availableSections = useMemo(() => {
    if (selectedClassId === "All") return [];
    const cls = classes.find((c) => c._id === selectedClassId);
    return cls?.sections || [];
  }, [selectedClassId, classes]);

  // Handle Export CSV
  const handleExportCSV = async () => {
    try {
      await downloadStudentsCSVAPI({
        classId: selectedClassId,
        sectionId: selectedSectionId,
      });
      push("Students roster downloaded successfully!", "success");
    } catch (err) {
      push(err.message || "Failed to download CSV", "error");
    }
  };

  // Toggle selection
  const toggleSelectStudent = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map((s) => s._id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="Students Directory"
        subtitle={`${students.length} students enrolled · Manage admissions & records`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {canManage && selectedIds.length > 0 && (
              <button
                onClick={() => setPromoteModalOpen(true)}
                className="btn bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm animate-fade-in"
              >
                <ArrowUpRight className="h-4 w-4" />
                Promote Selected ({selectedIds.length})
              </button>
            )}

            <button
              className="btn-secondary"
              onClick={handleExportCSV}
              title="Download students roster as CSV file"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>

            {canManage && (
              <button
                onClick={openAdd}
                className="btn-primary"
              >
                <Plus className="h-4 w-4" /> New Admission
              </button>
            )}
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadStudents()}
              placeholder="Search by student name or admission number…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Class Filter */}
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSectionId("All");
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="All">All Classes</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Section Filter */}
            {availableSections.length > 0 && (
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="All">All Sections</option>
                {availableSections.map((s) => (
                  <option key={s._id} value={s._id}>
                    Sec {s.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={loadStudents}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              title="Refresh roster"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              {canManage && (
                <th className="w-10 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={students.length > 0 && selectedIds.length === students.length}
                    onChange={toggleSelectAll}
                    className="rounded text-brand-600"
                  />
                </th>
              )}
              <th className="px-4 py-3.5">Student / Admission No</th>
              <th className="px-4 py-3.5">Class & Section</th>
              <th className="px-4 py-3.5">Roll No</th>
              <th className="px-4 py-3.5">Parent / Contact</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="py-12 text-center text-slate-400">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-600" />
                  <p className="mt-2 text-xs">Loading student records…</p>
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="py-12 text-center text-slate-400">
                  <Users className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-600">No students found</p>
                  <p className="text-xs text-slate-400">Try adjusting your filters or admit a new student</p>
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s._id} className="hover:bg-slate-50/50 transition">
                  {canManage && (
                    <td className="px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(s._id)}
                        onChange={() => toggleSelectStudent(s._id)}
                        className="rounded text-brand-600"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} size="sm" />
                      <div>
                        <p className="font-semibold text-slate-900">{s.name}</p>
                        <span className="font-mono text-xs text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded dark:bg-brand-950/60 dark:text-brand-300">
                          {s.admissionNo}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-800">
                    {s.className} · {s.sectionName}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                    #{s.rollNo}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-slate-800">{s.parentName}</p>
                    <p className="text-xs text-slate-400">{s.parentPhone}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onView(s)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                        title="View Full Profile"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canManage && (
                        <button
                          onClick={() => setEditTarget(s)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                          title="Edit Student"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Admission Modal */}
      {openAdd && (
        <AdmissionModal
          classes={classes}
          onClose={onCloseAdd}
          onSuccess={() => {
            onCloseAdd();
            loadStudents();
            push("Student admitted successfully!", "success");
          }}
        />
      )}

      {/* Edit Student Modal */}
      {editTarget && (
        <EditStudentModal
          student={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            loadStudents();
            push("Student updated successfully!", "success");
          }}
        />
      )}

      {/* Promote Students Modal */}
      {promoteModalOpen && (
        <PromoteModal
          studentIds={selectedIds}
          classes={classes}
          academicYears={academicYears}
          onClose={() => setPromoteModalOpen(false)}
          onSuccess={(msg) => {
            setPromoteModalOpen(false);
            setSelectedIds([]);
            loadStudents();
            push(msg, "success");
          }}
        />
      )}
    </div>
  );
}

// ─── Admission Modal ──────────────────────────────────────────────────────────

function AdmissionModal({ classes, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("2015-05-10");
  const [gender, setGender] = useState("male");
  const [classId, setClassId] = useState(classes[0]?._id || "");
  const [sectionId, setSectionId] = useState(classes[0]?.sections?.[0]?._id || "");
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("father");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [address, setAddress] = useState("");
  const [bloodGroup, setBloodGroup] = useState("A+");
  const [createParentLogin, setCreateParentLogin] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const activeClass = classes.find((c) => c._id === classId);
  const sectionsForClass = activeClass?.sections || [];

  const handleClassChange = (newClassId) => {
    setClassId(newClassId);
    const cls = classes.find((c) => c._id === newClassId);
    if (cls?.sections?.length) {
      setSectionId(cls.sections[0]._id);
    } else {
      setSectionId("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!sectionId) {
      setError("Please select a class that contains at least one section.");
      return;
    }

    setIsSubmitting(true);
    try {
      await admitStudentAPI({
        name,
        dob,
        gender,
        classId,
        sectionId,
        address,
        bloodGroup,
        guardian: {
          name: guardianName,
          relation: guardianRelation,
          phone: guardianPhone,
        },
        createParentLogin,
      });
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to admit student");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl my-8">
        <h3 className="text-lg font-bold text-slate-900">New Student Admission</h3>
        <p className="text-xs text-slate-500">
          Enrolls student and issues an official sequence-generated Admission Number
        </p>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Student Full Name *</label>
              <input
                required
                placeholder="e.g. Zainab Bibi"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Date of Birth *</label>
              <input
                type="date"
                required
                className="input"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Gender *</label>
              <select
                className="input"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div>
              <label className="label">Grade Level / Class *</label>
              <select
                required
                className="input"
                value={classId}
                onChange={(e) => handleClassChange(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Section *</label>
              <select
                required
                className="input"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
              >
                {sectionsForClass.length === 0 ? (
                  <option value="">No sections available</option>
                ) : (
                  sectionsForClass.map((s) => (
                    <option key={s._id} value={s._id}>
                      Sec {s.name} ({s.capacity} max)
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Guardian Details
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Guardian Name *</label>
                <input
                  required
                  placeholder="Parent / Guardian name"
                  className="input"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Relation</label>
                <select
                  className="input"
                  value={guardianRelation}
                  onChange={(e) => setGuardianRelation(e.target.value)}
                >
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="guardian">Guardian</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="label">Primary Phone (For SMS & Portal Login) *</label>
                <input
                  required
                  placeholder="e.g. +92 300 1234567"
                  className="input"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="createParent"
              checked={createParentLogin}
              onChange={(e) => setCreateParentLogin(e.target.checked)}
              className="rounded text-brand-600"
            />
            <label htmlFor="createParent" className="text-xs font-semibold text-slate-700">
              Create Parent Portal Login Account (Password: Parent@123)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? "Processing…" : "Admit Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Student Modal ───────────────────────────────────────────────────────

function EditStudentModal({ student, onClose, onSuccess }) {
  const [name, setName] = useState(student.name);
  const [gender, setGender] = useState(student.gender || "male");
  const [address, setAddress] = useState(student.address || "");
  const [bloodGroup, setBloodGroup] = useState(student.bloodGroup || "");
  const [emergencyPhone, setEmergencyPhone] = useState(student.emergencyPhone || "");
  const [status, setStatus] = useState(student.status || "active");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await updateStudentAPI(student._id, {
        name,
        gender,
        address,
        bloodGroup,
        emergencyPhone,
        status,
      });
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to update student");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-bold text-slate-900">Edit Student Record</h3>
        <p className="text-xs text-slate-500">{student.admissionNo}</p>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="label">Full Name</label>
            <input required className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Gender</label>
              <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="label">Status</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="graduated">Graduated</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Emergency Phone</label>
            <input className="input" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
          </div>

          <div>
            <label className="label">Residential Address</label>
            <textarea rows={2} className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? "Saving…" : "Save Changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Promote Modal ────────────────────────────────────────────────────────────

function PromoteModal({ studentIds, classes, academicYears, onClose, onSuccess }) {
  const [targetAcademicYearId, setTargetAcademicYearId] = useState(academicYears[0]?._id || "");
  const [targetClassId, setTargetClassId] = useState(classes[0]?._id || "");
  const [targetSectionId, setTargetSectionId] = useState(classes[0]?.sections?.[0]?._id || "");
  const [outcome, setOutcome] = useState("promoted");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const activeClass = classes.find((c) => c._id === targetClassId);
  const sections = activeClass?.sections || [];

  const handleClassChange = (newCId) => {
    setTargetClassId(newCId);
    const cls = classes.find((c) => c._id === newCId);
    if (cls?.sections?.length) {
      setTargetSectionId(cls.sections[0]._id);
    } else {
      setTargetSectionId("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await promoteStudentsAPI({
        studentIds,
        targetAcademicYearId,
        targetClassId,
        targetSectionId,
        outcome,
      });
      onSuccess(res?.data?.message || `Promoted ${studentIds.length} students`);
    } catch (err) {
      setError(err.message || "Failed to process promotion");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-bold text-slate-900">Promote / Repeat Students</h3>
        <p className="text-xs text-slate-500">
          Enrolls {studentIds.length} selected student(s) into a new academic session
        </p>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="label">Target Academic Year *</label>
            <select
              className="input"
              value={targetAcademicYearId}
              onChange={(e) => setTargetAcademicYearId(e.target.value)}
            >
              {academicYears.map((y) => (
                <option key={y._id} value={y._id}>
                  {y.name} {y.isCurrent ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Target Class *</label>
              <select
                className="input"
                value={targetClassId}
                onChange={(e) => handleClassChange(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Target Section *</label>
              <select
                className="input"
                value={targetSectionId}
                onChange={(e) => setTargetSectionId(e.target.value)}
              >
                {sections.map((s) => (
                  <option key={s._id} value={s._id}>
                    Sec {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Outcome Status</label>
            <select className="input" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              <option value="promoted">Promoted (Advanced to next grade)</option>
              <option value="repeated">Repeated (Same grade)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? "Promoting…" : "Confirm Promotion"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Profile Modal ────────────────────────────────────────────────────────────

export function StudentProfileModal({ student, onClose }) {
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (student?._id) {
      setIsLoading(true);
      getStudentByIdAPI(student._id)
        .then((res) => setProfileData(res?.data))
        .catch(() => setProfileData(student))
        .finally(() => setIsLoading(false));
    }
  }, [student]);

  if (!student) return null;
  const s = profileData || student;

  return (
    <Modal
      open={!!student}
      onClose={onClose}
      title="Student Profile & ID Card"
      subtitle={`${s.className || "Class"} · Section ${s.sectionName || "A"}`}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <button className="btn-secondary" onClick={() => window.print()} title="Print ID Card">
            <Printer className="h-4 w-4" /> Print ID Card
          </button>
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      }
    >
      <div id="printable-id-card" className="space-y-4 print-area bg-white p-2">
        <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-brand-50 to-slate-50 p-5 ring-1 ring-brand-100">
          <Avatar name={s.name} size="lg" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{s.name}</h3>
              <span className="badge bg-brand-100 text-brand-700 font-mono text-xs">
                {s.admissionNo}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-600">
              {s.className} · Section {s.sectionName} · Roll #{s.rollNo}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Gender: <span className="capitalize">{s.gender}</span> · Blood Group: {s.bloodGroup || "—"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Parent / Guardian</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{s.parentName}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Emergency Phone</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              {s.parentPhone || s.emergencyPhone || "—"}
            </p>
          </div>
          <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Residential Address</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{s.address || "—"}</p>
          </div>
        </div>

        {/* Academic History */}
        {s.enrollmentHistory && s.enrollmentHistory.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Enrollment & Promotion History
            </h4>
            <div className="space-y-1.5">
              {s.enrollmentHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-800">{h.academicYearId?.name || "Session"}</span>
                  <span className="text-slate-600">{h.classId?.name} - Sec {h.sectionId?.name}</span>
                  <span className="capitalize font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                    {h.outcome}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

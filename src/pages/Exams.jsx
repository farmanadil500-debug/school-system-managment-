import React, { useMemo, useState, useEffect } from "react";
import {
  ClipboardList,
  Printer,
  GraduationCap,
  Award,
  Plus,
  Lock,
  Unlock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Eye,
  RefreshCw,
  Loader2,
  Save,
  FileCheck,
  Send,
  BookOpen,
} from "lucide-react";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { Avatar, EmptyState, SectionHeader, StatusBadge } from "../components/ui";
import { CLASSES, EXAM_TERMS, SUBJECTS, getGradeFromPct, gradeColor } from "../data/mock";
import { apiFetch } from "../lib/api-client";
import {
  fetchExamsAPI,
  createExamAPI,
  updateExamAPI,
  addExamSubjectAPI,
  enterMarksAPI,
  fetchSectionMarksAPI,
  fetchStudentReportCardAPI,
} from "../lib/exams-api";
import { useAuth } from "../lib/auth-context";
import { can, ROLES } from "../lib/permissions";

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  scheduled: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-800",
  marking: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
  locked: "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:ring-purple-800",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
};

export default function Exams({ students = [] }) {
  const { push } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  // Tabs: "marks_entry" | "report_cards" | "exams_list"
  const [activeTab, setActiveTab] = useState("marks_entry");

  // Exams State
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [isLoadingExams, setIsLoadingExams] = useState(true);

  // Academic Metadata
  const [classesList, setClassesList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  // Marks Entry State
  const [marksSheet, setMarksSheet] = useState(null);
  const [marksRecords, setMarksRecords] = useState([]);
  const [isLoadingMarks, setIsLoadingMarks] = useState(false);
  const [isSavingMarks, setIsSavingMarks] = useState(false);

  // Report Card State
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [reportCardData, setReportCardData] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Modals
  const [createExamModalOpen, setCreateExamModalOpen] = useState(false);
  const [scheduleSubjectModalOpen, setScheduleSubjectModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Exam Form
  const [examForm, setExamForm] = useState({
    name: "",
    termName: "Term 1",
    classIds: [],
    startDate: "",
    endDate: "",
  });

  // Schedule Subject Form
  const [subjectForm, setSubjectForm] = useState({
    classId: "",
    subjectId: "",
    date: "",
    totalMarks: 100,
    passingMarks: 33,
  });

  // 1. Fetch Classes and Subjects
  useEffect(() => {
    async function loadMeta() {
      try {
        const [clsRes, subRes] = await Promise.allSettled([
          apiFetch("/api/v1/academic/classes"),
          apiFetch("/api/v1/academic/subjects"),
        ]);

        if (clsRes.status === "fulfilled" && clsRes.value?.data) {
          const cls = clsRes.value.data;
          setClassesList(cls);
          if (cls.length > 0) {
            setSelectedClassId(cls[0]._id);
            if (cls[0].sections?.length > 0) {
              setSelectedSectionId(cls[0].sections[0]._id);
            }
          }
        }

        if (subRes.status === "fulfilled" && subRes.value?.data) {
          const subs = subRes.value.data;
          setSubjectsList(subs);
          if (subs.length > 0) setSelectedSubjectId(subs[0]._id);
        }
      } catch (_e) {
        // Fallback
      }
    }
    loadMeta();
  }, []);

  // Update Section when Class changes
  const currentClass = useMemo(
    () => classesList.find((c) => c._id === selectedClassId),
    [classesList, selectedClassId]
  );

  const availableSections = useMemo(
    () => currentClass?.sections || [],
    [currentClass]
  );

  useEffect(() => {
    if (availableSections.length > 0) {
      if (!availableSections.some((s) => s._id === selectedSectionId)) {
        setSelectedSectionId(availableSections[0]._id);
      }
    } else {
      setSelectedSectionId("");
    }
  }, [availableSections, selectedSectionId]);

  // 2. Fetch Exams List
  const loadExams = async () => {
    setIsLoadingExams(true);
    try {
      const res = await fetchExamsAPI();
      if (res?.data && res.data.length > 0) {
        setExams(res.data);
        if (!selectedExamId) setSelectedExamId(res.data[0]._id);
      } else {
        // Mock fallback
        const fallback = [
          {
            _id: "mock-exam-1",
            name: "Mid-Term Examination 2026",
            termName: "Mid-term",
            status: "marking",
            startDate: "2026-11-15",
            endDate: "2026-11-25",
          },
          {
            _id: "mock-exam-2",
            name: "Final Term Examination 2026",
            termName: "Final",
            status: "scheduled",
            startDate: "2026-12-10",
            endDate: "2026-12-22",
          },
        ];
        setExams(fallback);
        if (!selectedExamId) setSelectedExamId(fallback[0]._id);
      }
    } catch (_e) {
      setExams([]);
    } finally {
      setIsLoadingExams(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const selectedExam = useMemo(
    () => exams.find((e) => e._id === selectedExamId),
    [exams, selectedExamId]
  );

  // 3. Load Marks Entry Sheet
  const loadMarksSheet = async () => {
    if (!selectedExamId || !selectedSectionId || !selectedSubjectId) return;

    setIsLoadingMarks(true);
    try {
      const res = await fetchSectionMarksAPI(
        selectedExamId,
        selectedSectionId,
        selectedSubjectId
      );

      if (res?.data) {
        setMarksSheet(res.data);
        setMarksRecords(res.data.records || []);
      }
    } catch (_err) {
      // Fallback from mock students
      const fallbackRecords = (students || [])
        .filter(
          (s) =>
            s.class === (currentClass?.name || "Grade 1") &&
            s.section ===
              (availableSections.find((sec) => sec._id === selectedSectionId)?.name || "A")
        )
        .map((s, idx) => {
          const score = 75 + (idx % 20);
          return {
            studentId: s.id || s._id,
            name: s.name,
            admissionNo: `ADM-${s.rollNo}`,
            rollNo: s.rollNo,
            marksObtained: score,
            isAbsent: false,
            remarks: "",
            percentage: score,
            grade: getGradeFromPct(score),
            isPassed: score >= 33,
          };
        });

      setMarksSheet({
        exam: { name: selectedExam?.name || "Mid-Term", status: selectedExam?.status || "marking" },
        totalMarks: 100,
        passingMarks: 33,
        canEdit: true,
      });
      setMarksRecords(fallbackRecords);
    } finally {
      setIsLoadingMarks(false);
    }
  };

  useEffect(() => {
    if (activeTab === "marks_entry" && selectedExamId && selectedSectionId && selectedSubjectId) {
      loadMarksSheet();
    }
  }, [activeTab, selectedExamId, selectedSectionId, selectedSubjectId]);

  // Update a single student mark in the table
  const handleScoreChange = (studentId, val) => {
    const totalMax = marksSheet?.totalMarks || 100;
    const num = Math.max(0, Math.min(totalMax, Number(val) || 0));

    setMarksRecords((prev) =>
      prev.map((r) => {
        if (r.studentId === studentId) {
          const pct = Math.round((num / totalMax) * 100);
          return {
            ...r,
            marksObtained: num,
            percentage: pct,
            grade: r.isAbsent ? "ABS" : getGradeFromPct(pct),
            isPassed: !r.isAbsent && num >= (marksSheet?.passingMarks || 33),
          };
        }
        return r;
      })
    );
  };

  const handleAbsentToggle = (studentId, isAbsent) => {
    setMarksRecords((prev) =>
      prev.map((r) => {
        if (r.studentId === studentId) {
          return {
            ...r,
            isAbsent,
            marksObtained: isAbsent ? 0 : r.marksObtained,
            grade: isAbsent ? "ABS" : getGradeFromPct(r.percentage),
            isPassed: !isAbsent && r.marksObtained >= (marksSheet?.passingMarks || 33),
          };
        }
        return r;
      })
    );
  };

  const handleRemarkChange = (studentId, remarks) => {
    setMarksRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, remarks } : r))
    );
  };

  // Submit Marks Entry
  const handleSaveMarks = async () => {
    if (!selectedExamId || marksRecords.length === 0) return;

    setIsSavingMarks(true);
    try {
      const payload = {
        subjectId: selectedSubjectId,
        sectionId: selectedSectionId,
        marks: marksRecords.map((r) => ({
          studentId: r.studentId,
          marksObtained: r.marksObtained,
          isAbsent: r.isAbsent,
          remarks: r.remarks,
        })),
      };

      await enterMarksAPI(selectedExamId, payload);
      push("Marks saved successfully!", "success");
      await loadMarksSheet();
    } catch (err) {
      push(err.message || "Failed to save marks.", "error");
    } finally {
      setIsSavingMarks(false);
    }
  };

  // 4. Load Student Report Card
  const loadReportCard = async () => {
    if (!selectedExamId || !selectedStudentId) return;

    setIsLoadingReport(true);
    try {
      const res = await fetchStudentReportCardAPI(selectedExamId, selectedStudentId);
      if (res?.data) {
        setReportCardData(res.data);
      }
    } catch (_err) {
      // Fallback sample report card
      const st = students.find((s) => (s.id || s._id) === selectedStudentId);
      if (st) {
        setReportCardData({
          exam: { name: selectedExam?.name || "Annual Exam 2026", termName: selectedExam?.termName || "Final" },
          student: {
            name: st.name,
            admissionNo: `ADM-${st.rollNo}`,
            rollNo: st.rollNo,
            className: st.class,
            sectionName: st.section || "A",
            guardianName: st.parentName || "Parent",
          },
          subjects: SUBJECTS.map((sub, i) => {
            const marks = 75 + (i * 4);
            return {
              subjectName: sub,
              subjectCode: sub.slice(0, 3).toUpperCase(),
              totalMarks: 100,
              passingMarks: 33,
              marksObtained: marks,
              isAbsent: false,
              isPassed: true,
              percentage: marks,
              grade: getGradeFromPct(marks),
              remarks: "Very Good",
            };
          }),
          summary: {
            totalMarks: 500,
            obtainedMarks: 415,
            percentage: 83,
            grade: "A",
            remarks: "Excellent",
            result: "PASSED",
            position: 2,
            totalInClass: 24,
          },
        });
      }
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    if (activeTab === "report_cards" && selectedExamId && selectedStudentId) {
      loadReportCard();
    }
  }, [activeTab, selectedExamId, selectedStudentId]);

  // Set default student for report cards
  useEffect(() => {
    if (marksRecords.length > 0 && !selectedStudentId) {
      setSelectedStudentId(marksRecords[0].studentId);
    } else if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id || students[0]._id);
    }
  }, [marksRecords, students, selectedStudentId]);

  // Submit Create Exam
  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!examForm.name.trim()) {
      push("Exam name is required", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      await createExamAPI(examForm);
      push("Exam session created successfully!", "success");
      setCreateExamModalOpen(false);
      setExamForm({ name: "", termName: "Term 1", classIds: [], startDate: "", endDate: "" });
      await loadExams();
    } catch (err) {
      push(err.message || "Failed to create exam.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Exam Status Update (Lock / Unlock / Publish)
  const handleStatusChange = async (examId, newStatus) => {
    try {
      await updateExamAPI(examId, { status: newStatus });
      push(`Exam marked as ${newStatus}!`, "success");
      await loadExams();
    } catch (err) {
      push(err.message || "Failed to update exam status.", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <SectionHeader
        title="Exams & Report Cards"
        subtitle="Manage academic examination sessions, enter marks, and generate official student report cards"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab("marks_entry")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "marks_entry"
                    ? "bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>Marks Entry</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("report_cards")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "report_cards"
                    ? "bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Award className="h-3.5 w-3.5" />
                <span>Report Cards</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab("exams_list")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === "exams_list"
                      ? "bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Exam Sessions</span>
                </button>
              )}
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setCreateExamModalOpen(true)}
                className="btn-primary text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Exam</span>
              </button>
            )}
          </div>
        }
      />

      {/* ================= TAB 1: MARKS ENTRY ================= */}
      {activeTab === "marks_entry" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="card p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Exam:
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="input w-auto min-w-[170px] text-sm font-semibold"
                  >
                    {exams.map((ex) => (
                      <option key={ex._id} value={ex._id}>
                        {ex.name} ({ex.termName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Class:
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="input w-auto min-w-[120px] text-sm font-semibold"
                  >
                    {classesList.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Section:
                  </label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="input w-auto min-w-[110px] text-sm font-semibold"
                    disabled={availableSections.length === 0}
                  >
                    {availableSections.map((s) => (
                      <option key={s._id} value={s._id}>
                        Section {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Subject:
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="input w-auto min-w-[150px] text-sm font-semibold"
                  >
                    {subjectsList.length === 0 ? (
                      <option value="">No Subjects</option>
                    ) : (
                      subjectsList.map((sub) => (
                        <option key={sub._id} value={sub._id}>
                          {sub.name} ({sub.code || "SUB"})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={loadMarksSheet}
                  className="btn-ghost p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  title="Reload Sheet"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              {/* Status and Save Actions */}
              <div className="flex flex-wrap items-center gap-3">
                {selectedExam && (
                  <span
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 capitalize ${
                      STATUS_COLORS[selectedExam.status] || STATUS_COLORS.scheduled
                    }`}
                  >
                    Status: {selectedExam.status}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleSaveMarks}
                  disabled={
                    !marksSheet?.canEdit ||
                    isSavingMarks ||
                    marksRecords.length === 0
                  }
                  className="btn-primary inline-flex items-center gap-2 whitespace-nowrap text-xs"
                >
                  {isSavingMarks ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Marks</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Locked Warning Banner */}
            {marksSheet && !marksSheet.canEdit && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-purple-50 p-3 text-xs font-medium text-purple-800 ring-1 ring-purple-200">
                <Lock className="h-4 w-4 shrink-0 text-purple-600" />
                <span>
                  Marks Entry Locked: This exam has been locked or published.
                  Marks cannot be modified. Only administrators can unlock this session.
                </span>
              </div>
            )}
          </div>

          {/* Marks Entry Table */}
          {isLoadingMarks ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
              <p className="mt-3 text-sm text-slate-500">Loading student marks…</p>
            </div>
          ) : marksRecords.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={BookOpen}
                title="No students found in this section"
                subtitle="Select another class or section to enter examination marks."
              />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="table-wrap">
                <table className="table">
                  <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Roll #</th>
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-5 py-3.5 text-center">Absent?</th>
                      <th className="px-5 py-3.5 text-center">Marks (Max {marksSheet?.totalMarks || 100})</th>
                      <th className="px-5 py-3.5 text-center">Percentage</th>
                      <th className="px-5 py-3.5 text-center">Grade</th>
                      <th className="px-5 py-3.5 text-center">Result</th>
                      <th className="px-5 py-3.5">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {marksRecords.map((r) => (
                      <tr key={r.studentId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4 font-mono text-xs font-bold text-slate-600">
                          {r.rollNo || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={r.name} size="sm" />
                            <div>
                              <p className="font-semibold text-slate-900">{r.name}</p>
                              <p className="text-xs font-mono text-slate-400">{r.admissionNo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={r.isAbsent}
                            disabled={!marksSheet?.canEdit}
                            onChange={(e) => handleAbsentToggle(r.studentId, e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                          />
                        </td>
                        <td className="px-5 py-4 text-center">
                          <input
                            type="number"
                            min="0"
                            max={marksSheet?.totalMarks || 100}
                            disabled={!marksSheet?.canEdit || r.isAbsent}
                            value={r.isAbsent ? 0 : r.marksObtained}
                            onChange={(e) => handleScoreChange(r.studentId, e.target.value)}
                            className="input w-24 text-center font-mono font-bold text-sm mx-auto"
                          />
                        </td>
                        <td className="px-5 py-4 text-center font-mono text-xs font-bold text-slate-700">
                          {r.isAbsent ? "—" : `${r.percentage}%`}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`badge font-bold ${
                              r.isAbsent
                                ? "bg-slate-100 text-slate-500"
                                : gradeColor(r.grade)
                            }`}
                          >
                            {r.grade}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`badge font-semibold ${
                              r.isAbsent
                                ? "bg-slate-100 text-slate-500"
                                : r.isPassed
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                            }`}
                          >
                            {r.isAbsent ? "Absent" : r.isPassed ? "Pass" : "Fail"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <input
                            type="text"
                            disabled={!marksSheet?.canEdit}
                            value={r.remarks}
                            onChange={(e) => handleRemarkChange(r.studentId, e.target.value)}
                            placeholder="Optional notes…"
                            className="input py-1 text-xs"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: REPORT CARDS ================= */}
      {activeTab === "report_cards" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="card p-4 no-print">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Exam:
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="input w-auto text-sm font-semibold"
                  >
                    {exams.map((ex) => (
                      <option key={ex._id} value={ex._id}>
                        {ex.name} ({ex.termName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Student:
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="input w-auto text-sm font-semibold"
                  >
                    {(students || []).map((s) => (
                      <option key={s.id || s._id} value={s.id || s._id}>
                        {s.name} ({s.class} · Roll #{s.rollNo})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={loadReportCard}
                  className="btn-secondary text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="btn-primary"
              >
                <Printer className="h-4 w-4" />
                <span>Print Report Card</span>
              </button>
            </div>
          </div>

          {/* Report Card Document View */}
          {isLoadingReport ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
              <p className="mt-3 text-sm text-slate-500">Generating report card…</p>
            </div>
          ) : !reportCardData ? (
            <div className="card">
              <EmptyState
                icon={GraduationCap}
                title="Select a student to view report card"
                subtitle="Choose an exam and enrolled student from the dropdown above."
              />
            </div>
          ) : (
            <div className="card p-8 bg-white border border-slate-200 shadow-md font-sans" id="printable-report-card">
              {/* Report Card Header */}
              <div className="border-b-2 border-slate-900 pb-5 text-center">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  APEX INTERNATIONAL SCHOOL
                </h1>
                <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mt-1">
                  Official Academic Achievement Report Card
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                  <span>{reportCardData.exam?.name}</span>
                  <span>·</span>
                  <span>{reportCardData.exam?.termName}</span>
                </div>
              </div>

              {/* Student Profile Info */}
              <div className="grid grid-cols-2 gap-4 py-5 border-b border-slate-200 text-xs sm:grid-cols-4">
                <div>
                  <span className="text-slate-400 font-medium">Student Name:</span>
                  <p className="font-bold text-slate-900 text-sm">
                    {reportCardData.student?.name}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Admission / Roll #:</span>
                  <p className="font-bold text-slate-900 text-sm">
                    {reportCardData.student?.admissionNo} (Roll #{reportCardData.student?.rollNo})
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Class & Section:</span>
                  <p className="font-bold text-slate-900 text-sm">
                    {reportCardData.student?.className} - {reportCardData.student?.sectionName}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Guardian Name:</span>
                  <p className="font-bold text-slate-900 text-sm">
                    {reportCardData.student?.guardianName || "—"}
                  </p>
                </div>
              </div>

              {/* Subject Breakdown Table */}
              <div className="py-6">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="p-3">Subject</th>
                      <th className="p-3 text-center">Max Marks</th>
                      <th className="p-3 text-center">Pass Marks</th>
                      <th className="p-3 text-center">Marks Obtained</th>
                      <th className="p-3 text-center">Percentage</th>
                      <th className="p-3 text-center">Grade</th>
                      <th className="p-3 text-right">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportCardData.subjects?.map((sub, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">
                          {sub.subjectName}{" "}
                          <span className="text-slate-400 font-normal">({sub.subjectCode})</span>
                        </td>
                        <td className="p-3 text-center font-mono">{sub.totalMarks}</td>
                        <td className="p-3 text-center font-mono text-slate-500">{sub.passingMarks}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-900">
                          {sub.isAbsent ? "ABS" : sub.marksObtained}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">
                          {sub.isAbsent ? "—" : `${sub.percentage}%`}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`font-bold ${gradeColor(sub.grade)}`}>
                            {sub.grade}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={`badge text-[11px] font-semibold ${
                              sub.isPassed
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {sub.isAbsent ? "Absent" : sub.isPassed ? "Pass" : "Fail"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Performance Cards */}
              <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-5 border border-slate-200 text-center sm:grid-cols-5">
                <div>
                  <p className="text-[11px] font-bold uppercase text-slate-400">Total Marks</p>
                  <p className="mt-1 text-lg font-black text-slate-900">
                    {reportCardData.summary?.obtainedMarks} / {reportCardData.summary?.totalMarks}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-slate-400">Overall %</p>
                  <p className="mt-1 text-lg font-black text-brand-600">
                    {reportCardData.summary?.percentage}%
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-slate-400">Overall Grade</p>
                  <p className={`mt-1 text-lg font-black ${gradeColor(reportCardData.summary?.grade)}`}>
                    {reportCardData.summary?.grade} ({reportCardData.summary?.remarks})
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-slate-400">Class Rank</p>
                  <p className="mt-1 text-lg font-black text-amber-600">
                    #{reportCardData.summary?.position} of {reportCardData.summary?.totalInClass}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-slate-400">Final Result</p>
                  <p
                    className={`mt-1 text-lg font-black ${
                      reportCardData.summary?.result === "PASSED"
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {reportCardData.summary?.result}
                  </p>
                </div>
              </div>

              {/* Signature Blocks */}
              <div className="mt-14 flex items-end justify-between text-xs text-slate-500 pt-6">
                <div className="text-center">
                  <div className="w-36 border-b border-slate-400 mb-2"></div>
                  <span className="font-semibold text-slate-700">Class Teacher Signature</span>
                </div>
                <div className="text-center">
                  <div className="w-28 h-28 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400 uppercase font-mono mb-2">
                    School Seal
                  </div>
                </div>
                <div className="text-center">
                  <div className="w-36 border-b border-slate-400 mb-2"></div>
                  <span className="font-semibold text-slate-700">Principal Signature</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: EXAM SESSIONS ================= */}
      {activeTab === "exams_list" && isAdmin && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Academic Examination Sessions</h3>
                <p className="text-xs text-slate-500">
                  Control exam lifecycle: schedule, lock marks entry, and publish report cards
                </p>
              </div>
              <button
                type="button"
                onClick={loadExams}
                className="btn-secondary text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {exams.map((ex) => (
              <div key={ex._id} className="card p-5 space-y-4 hover:shadow-cardhover transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{ex.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Term: <strong>{ex.termName}</strong> ·{" "}
                      {ex.startDate ? `${ex.startDate} to ${ex.endDate}` : "Dates pending"}
                    </p>
                  </div>
                  <span className={`badge capitalize ${STATUS_COLORS[ex.status] || STATUS_COLORS.scheduled}`}>
                    {ex.status}
                  </span>
                </div>

                {/* Lifecycle Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                  {ex.status !== "locked" && ex.status !== "published" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(ex._id, "locked")}
                      className="btn-secondary text-xs text-purple-700 border-purple-200 hover:bg-purple-50"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Lock Marks
                    </button>
                  )}

                  {ex.status === "locked" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(ex._id, "marking")}
                      className="btn-secondary text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      Unlock Marks
                    </button>
                  )}

                  {ex.status !== "published" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(ex._id, "published")}
                      className="btn-primary text-xs"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Publish Results
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedExamId(ex._id);
                      setActiveTab("marks_entry");
                    }}
                    className="btn-ghost text-xs text-brand-600 ml-auto"
                  >
                    Open Marks Sheet →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE EXAM ================= */}
      <Modal
        open={createExamModalOpen}
        onClose={() => setCreateExamModalOpen(false)}
        title="Create Examination Session"
        subtitle="Schedule a mid-term, annual, or term assessment"
        size="md"
      >
        <form onSubmit={handleCreateExam} className="space-y-4">
          <div>
            <label className="label">Exam Name *</label>
            <input
              required
              value={examForm.name}
              onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
              placeholder="e.g. Mid-Term Examination 2026"
              className="input font-semibold"
            />
          </div>

          <div>
            <label className="label">Exam Term *</label>
            <input
              required
              value={examForm.termName}
              onChange={(e) => setExamForm({ ...examForm, termName: e.target.value })}
              placeholder="e.g. Mid-Term or Term 1"
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                value={examForm.startDate}
                onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                value={examForm.endDate}
                onChange={(e) => setExamForm({ ...examForm, endDate: e.target.value })}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setCreateExamModalOpen(false)}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating…" : "Create Exam"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

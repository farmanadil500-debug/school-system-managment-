import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  CalendarCheck,
  Wallet,
  GraduationCap,
  Download,
  Filter,
  Search,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Loader2,
  Award,
} from "lucide-react";
import { SectionHeader, EmptyState } from "../components/ui";
import { useToast } from "../components/Toast";
import { useAuth } from "../lib/auth-context";
import { ROLES } from "../lib/permissions";
import { apiFetch } from "../lib/api-client";
import { formatPKR } from "../data/mock";
import {
  fetchAttendanceReportAPI,
  downloadAttendanceReportCSV,
  fetchFeeReportAPI,
  downloadFeeReportCSV,
  fetchExamReportAPI,
  downloadExamReportCSV,
} from "../lib/reports-api";

export default function Reports() {
  const { push } = useToast();
  const { user } = useAuth();

  const isAdmin = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;
  const isTeacher = user?.role === ROLES.TEACHER;
  const isAccountant = user?.role === ROLES.ACCOUNTANT;

  // Active Tab: "attendance" | "fees" | "exams"
  const defaultTab = isAccountant ? "fees" : "attendance";
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Metadata
  const [classesList, setClassesList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);
  const [examsList, setExamsList] = useState([]);

  // Attendance Report State
  const [attClassId, setAttClassId] = useState("All");
  const [attSectionId, setAttSectionId] = useState("All");
  const [attStartDate, setAttStartDate] = useState("");
  const [attEndDate, setAttEndDate] = useState("");
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  // Fee Report State
  const [feeClassId, setFeeClassId] = useState("All");
  const [feePeriod, setFeePeriod] = useState(
    new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit" }).format(new Date())
  );
  const [feeStatus, setFeeStatus] = useState("All");
  const [feeReport, setFeeReport] = useState(null);
  const [isLoadingFee, setIsLoadingFee] = useState(false);

  // Exam Report State
  const [examId, setExamId] = useState("");
  const [examSectionId, setExamSectionId] = useState("All");
  const [examReport, setExamReport] = useState(null);
  const [isLoadingExam, setIsLoadingExam] = useState(false);

  // 1. Load Reference Metadata
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [classesRes, sectionsRes, examsRes] = await Promise.allSettled([
          apiFetch("/api/v1/academic/classes"),
          apiFetch("/api/v1/academic/sections"),
          apiFetch("/api/v1/exams"),
        ]);

        if (classesRes.status === "fulfilled" && classesRes.value?.data) {
          setClassesList(classesRes.value.data);
        }
        if (sectionsRes.status === "fulfilled" && sectionsRes.value?.data) {
          setSectionsList(sectionsRes.value.data);
        }
        if (examsRes.status === "fulfilled" && examsRes.value?.data) {
          setExamsList(examsRes.value.data);
          if (examsRes.value.data.length > 0) {
            setExamId(examsRes.value.data[0]._id);
          }
        }
      } catch (_err) {
        // Fallback or silent
      }
    }
    loadMetadata();
  }, []);

  // Filter sections by selected class for attendance
  const filteredAttSections = useMemo(() => {
    if (attClassId === "All") return sectionsList;
    return sectionsList.filter(
      (s) => (s.classId?._id || s.classId || "").toString() === attClassId.toString()
    );
  }, [sectionsList, attClassId]);

  // 2. Fetch Attendance Report
  const loadAttendanceReport = async () => {
    setIsLoadingAttendance(true);
    try {
      const res = await fetchAttendanceReportAPI({
        classId: attClassId,
        sectionId: attSectionId,
        startDate: attStartDate,
        endDate: attEndDate,
      });
      setAttendanceReport(res.data || null);
    } catch (err) {
      push({ type: "error", message: err.message || "Failed to load attendance report" });
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  // 3. Fetch Fee Report
  const loadFeeReport = async () => {
    setIsLoadingFee(true);
    try {
      const res = await fetchFeeReportAPI({
        classId: feeClassId,
        period: feePeriod,
        status: feeStatus,
      });
      setFeeReport(res.data || null);
    } catch (err) {
      push({ type: "error", message: err.message || "Failed to load fee report" });
    } finally {
      setIsLoadingFee(false);
    }
  };

  // 4. Fetch Exam Report
  const loadExamReport = async () => {
    if (!examId) return;
    setIsLoadingExam(true);
    try {
      const res = await fetchExamReportAPI({
        examId,
        sectionId: examSectionId,
      });
      setExamReport(res.data || null);
    } catch (err) {
      push({ type: "error", message: err.message || "Failed to load exam report" });
    } finally {
      setIsLoadingExam(false);
    }
  };

  // Auto-fetch active tab reports
  useEffect(() => {
    if (activeTab === "attendance" && !isAccountant) {
      loadAttendanceReport();
    } else if (activeTab === "fees" && !isTeacher) {
      loadFeeReport();
    } else if (activeTab === "exams" && !isAccountant) {
      loadExamReport();
    }
  }, [
    activeTab,
    attClassId,
    attSectionId,
    attStartDate,
    attEndDate,
    feeClassId,
    feePeriod,
    feeStatus,
    examId,
    examSectionId,
  ]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <SectionHeader
        title="Reports & Analytics Center"
        subtitle="Performance analytics, fee revenue audits, and official CSV data exports."
      />

      {/* Tabs */}
      <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm max-w-xl">
        {!isAccountant && (
          <button
            onClick={() => setActiveTab("attendance")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
              activeTab === "attendance"
                ? "bg-brand-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarCheck className="h-4 w-4" />
            <span>Attendance</span>
          </button>
        )}

        {!isTeacher && (
          <button
            onClick={() => setActiveTab("fees")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
              activeTab === "fees"
                ? "bg-brand-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>Revenue & Fees</span>
          </button>
        )}

        {!isAccountant && (
          <button
            onClick={() => setActiveTab("exams")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
              activeTab === "exams"
                ? "bg-brand-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            <span>Exams & Results</span>
          </button>
        )}
      </div>

      {/* TAB 1: ATTENDANCE REPORTS */}
      {activeTab === "attendance" && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="card p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Grade / Class</label>
                <select
                  value={attClassId}
                  onChange={(e) => setAttClassId(e.target.value)}
                  className="input text-xs py-2"
                >
                  <option value="All">All Grades</option>
                  {classesList.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Section</label>
                <select
                  value={attSectionId}
                  onChange={(e) => setAttSectionId(e.target.value)}
                  className="input text-xs py-2"
                >
                  <option value="All">All Sections</option>
                  {filteredAttSections.map((s) => (
                    <option key={s._id} value={s._id}>
                      Section {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">From Date</label>
                <input
                  type="date"
                  value={attStartDate}
                  onChange={(e) => setAttStartDate(e.target.value)}
                  className="input text-xs py-1.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">To Date</label>
                <input
                  type="date"
                  value={attEndDate}
                  onChange={(e) => setAttEndDate(e.target.value)}
                  className="input text-xs py-1.5"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    downloadAttendanceReportCSV({
                      classId: attClassId,
                      sectionId: attSectionId,
                      startDate: attStartDate,
                      endDate: attEndDate,
                    })
                  }
                  className="btn-secondary w-full text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Overview Cards */}
          {attendanceReport?.summary && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Total Enrolled Students</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {attendanceReport.summary.totalStudents}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Average Attendance Rate</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {attendanceReport.summary.averageAttendanceRate}%
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">At-Risk Students (&lt;75%)</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">
                  {attendanceReport.summary.atRiskCount}
                </p>
              </div>
            </div>
          )}

          {/* Table */}
          {isLoadingAttendance ? (
            <div className="flex min-h-[250px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Adm No</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Roll</th>
                      <th className="px-4 py-3">Sessions</th>
                      <th className="px-4 py-3">Present</th>
                      <th className="px-4 py-3">Absent</th>
                      <th className="px-4 py-3">Late</th>
                      <th className="px-4 py-3">Leave</th>
                      <th className="px-4 py-3">Attendance %</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceReport?.records?.map((r) => (
                      <tr key={r.studentId} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600">{r.admissionNo}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-900">{r.name}</td>
                        <td className="px-4 py-2.5 text-slate-600">{r.className} — {r.sectionName}</td>
                        <td className="px-4 py-2.5 text-slate-600">{r.rollNo}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-800">{r.totalSessions}</td>
                        <td className="px-4 py-2.5 text-emerald-600 font-semibold">{r.present}</td>
                        <td className="px-4 py-2.5 text-rose-600 font-semibold">{r.absent}</td>
                        <td className="px-4 py-2.5 text-amber-600">{r.late}</td>
                        <td className="px-4 py-2.5 text-blue-600">{r.leave}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-900">{r.percentage}%</td>
                        <td className="px-4 py-2.5">
                          {r.isAtRisk ? (
                            <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200">
                              At Risk
                            </span>
                          ) : (
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                              Good
                            </span>
                          )}
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

      {/* TAB 2: FEE REVENUE & COLLECTIONS */}
      {activeTab === "fees" && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="card p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Billing Month</label>
                <input
                  type="text"
                  placeholder="YYYY-MM"
                  value={feePeriod}
                  onChange={(e) => setFeePeriod(e.target.value)}
                  className="input text-xs py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Class / Grade</label>
                <select
                  value={feeClassId}
                  onChange={(e) => setFeeClassId(e.target.value)}
                  className="input text-xs py-2"
                >
                  <option value="All">All Grades</option>
                  {classesList.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Voucher Status</label>
                <select
                  value={feeStatus}
                  onChange={(e) => setFeeStatus(e.target.value)}
                  className="input text-xs py-2"
                >
                  <option value="All">All Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>

              <div>
                <button
                  onClick={() =>
                    downloadFeeReportCSV({
                      classId: feeClassId,
                      period: feePeriod,
                      status: feeStatus,
                    })
                  }
                  className="btn-secondary w-full text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Revenue CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Overview Cards */}
          {feeReport?.summary && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Total Billed</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {formatPKR(feeReport.summary.totalBilled)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Total Collected</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">
                  {formatPKR(feeReport.summary.totalCollected)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Outstanding Balance</p>
                <p className="text-xl font-bold text-rose-600 mt-1">
                  {formatPKR(feeReport.summary.totalPending)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Collection Recovery</p>
                <p className="text-xl font-bold text-brand-600 mt-1">
                  {feeReport.summary.collectionRate}%
                </p>
              </div>
            </div>
          )}

          {/* Vouchers Table */}
          {isLoadingFee ? (
            <div className="flex min-h-[250px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Voucher #</th>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3">Adm No</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Billed</th>
                      <th className="px-4 py-3">Paid</th>
                      <th className="px-4 py-3">Remaining</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {feeReport?.records?.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-700">{v.voucherNo}</td>
                        <td className="px-4 py-2.5 text-slate-600">{v.period}</td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600">{v.admissionNo}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-900">{v.studentName}</td>
                        <td className="px-4 py-2.5 text-slate-600">{v.className} ({v.sectionName})</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-800">{formatPKR(v.total)}</td>
                        <td className="px-4 py-2.5 text-emerald-600 font-semibold">{formatPKR(v.paidAmount)}</td>
                        <td className="px-4 py-2.5 text-rose-600 font-semibold">{formatPKR(v.balance)}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold capitalize ${
                              v.status === "paid"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : v.status === "partial"
                                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                            }`}
                          >
                            {v.status}
                          </span>
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

      {/* TAB 3: ACADEMIC EXAMS & PERFORMANCE */}
      {activeTab === "exams" && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="card p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Exam Session</label>
                <select
                  value={examId}
                  onChange={(e) => setExamId(e.target.value)}
                  disabled={examsList.length === 0}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60"
                >
                  {examsList.length === 0 ? (
                    <option value="">No Exam Sessions Found</option>
                  ) : (
                    examsList.map((ex) => (
                      <option key={ex._id} value={ex._id}>
                        {ex.name} ({ex.termName})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Section</label>
                <select
                  value={examSectionId}
                  onChange={(e) => setExamSectionId(e.target.value)}
                  disabled={examsList.length === 0}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60"
                >
                  <option value="All">All Sections</option>
                  {sectionsList.map((s) => (
                    <option key={s._id} value={s._id}>
                      Section {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  onClick={() =>
                    downloadExamReportCSV({
                      examId,
                      sectionId: examSectionId,
                    })
                  }
                  disabled={examsList.length === 0 || !examReport?.records?.length}
                  className="btn-secondary w-full text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Results CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Exam Summary & Grade Distribution */}
          {examReport?.summary && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Summary Stats */}
              <div className="card p-5 space-y-3">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Exam Performance Metrics</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Students Evaluated:</span>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{examReport.summary.totalStudents}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Class Average:</span>
                    <p className="text-lg font-bold text-brand-600 dark:text-brand-400">{examReport.summary.classAverage}%</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Highest Score:</span>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{examReport.summary.highestScore}%</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Overall Pass Rate:</span>
                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{examReport.summary.passRate}%</p>
                  </div>
                </div>
              </div>

              {/* Grade Distribution Breakdown */}
              <div className="card p-5 lg:col-span-2">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">Letter Grade Distribution</h4>
                <div className="grid grid-cols-6 gap-2 text-center text-xs">
                  {Object.entries(examReport.summary.gradeDistribution || {}).map(([grade, count]) => (
                    <div key={grade} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                      <span className="font-bold text-brand-600 dark:text-brand-400 text-base">{grade}</span>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">{count} students</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Student Rankings Table / Empty State */}
          {isLoadingExam ? (
            <div className="card flex min-h-[250px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : examsList.length === 0 ? (
            <div className="card p-8">
              <EmptyState
                icon={GraduationCap}
                title="No Exam Sessions Found"
                subtitle="Currently there are no examination sessions created in the database. Go to 'Exams & Report Cards' page to create an exam session (e.g. Mid-Term, Final Term) and record student marks."
              />
            </div>
          ) : !examReport?.records || examReport.records.length === 0 ? (
            <div className="card p-8">
              <EmptyState
                icon={GraduationCap}
                title="No Exam Results Available Yet"
                subtitle="This exam session has been created, but marks have not been entered or computed yet. Go to 'Exams & Report Cards' to enter student marks."
              />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Adm No</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Section</th>
                      <th className="px-4 py-3">Marks Obtained</th>
                      <th className="px-4 py-3">Max Marks</th>
                      <th className="px-4 py-3">Percentage</th>
                      <th className="px-4 py-3">Grade</th>
                      <th className="px-4 py-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {examReport?.records?.map((s) => (
                      <tr key={s.studentId} className="hover:bg-slate-50/60 transition dark:hover:bg-slate-800/50">
                        <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200">
                          {s.position === 1 ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                              <Award className="h-4 w-4" /> 1st
                            </span>
                          ) : s.position === 2 ? (
                            <span className="text-slate-600 dark:text-slate-300 font-bold">2nd</span>
                          ) : s.position === 3 ? (
                            <span className="text-amber-800 dark:text-amber-300 font-bold">3rd</span>
                          ) : (
                            <span>#{s.position}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">{s.admissionNo}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100">{s.name}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">Sec {s.sectionName}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">{s.totalObtained}</td>
                        <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{s.totalPossible}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100">{s.percentage}%</td>
                        <td className="px-4 py-2.5">
                          <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                            {s.grade}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {s.isOverallPass ? (
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800">
                              Passed
                            </span>
                          ) : (
                            <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800">
                              Needs Improvement
                            </span>
                          )}
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
    </div>
  );
}

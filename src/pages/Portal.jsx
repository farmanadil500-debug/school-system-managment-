import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  GraduationCap,
  CalendarCheck,
  Wallet,
  Clock,
  Bell,
  Printer,
  ChevronRight,
  Receipt,
  Award,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Loader2,
  RefreshCw,
  School,
  ExternalLink,
} from "lucide-react";
import Modal from "../components/Modal";
import { EmptyState } from "../components/ui";
import { useAuth } from "../lib/auth-context";
import { ROLES } from "../lib/permissions";
import {
  fetchMyChildrenAPI,
  fetchStudentAttendanceAPI,
  fetchStudentFeesAPI,
  fetchStudentTimetableAPI,
  fetchStudentExamsAPI,
  fetchStudentNoticesAPI,
} from "../lib/portal-api";

export default function Portal() {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [activeChildId, setActiveChildId] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview, attendance, fees, timetable, exams, notices
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);

  // Tab Data States
  const [attendanceData, setAttendanceData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  const [feesData, setFeesData] = useState(null);
  const [isLoadingFees, setIsLoadingFees] = useState(false);
  const [selectedVoucherForReceipt, setSelectedVoucherForReceipt] = useState(null);

  const [timetableData, setTimetableData] = useState(null);
  const [isLoadingTimetable, setIsLoadingTimetable] = useState(false);
  const [selectedDay, setSelectedDay] = useState("monday");

  const [examsData, setExamsData] = useState([]);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState(null);

  const [noticesData, setNoticesData] = useState([]);
  const [isLoadingNotices, setIsLoadingNotices] = useState(false);

  // Load children on mount
  const loadChildren = async () => {
    setIsLoadingChildren(true);
    try {
      const res = await fetchMyChildrenAPI();
      if (res?.data && Array.isArray(res.data)) {
        setChildren(res.data);
        if (res.data.length > 0) {
          setActiveChildId(res.data[0]._id);
        }
      }
    } catch (_err) {
      // Fallback
    } finally {
      setIsLoadingChildren(false);
    }
  };

  useEffect(() => {
    loadChildren();
  }, []);

  const activeChild = useMemo(() => {
    return children.find((c) => c._id === activeChildId) || children[0] || null;
  }, [children, activeChildId]);

  // Load active tab data when active child or tab changes
  useEffect(() => {
    if (!activeChild?._id) return;

    if (activeTab === "overview") {
      // Preload overview components in parallel
      fetchStudentAttendanceAPI(activeChild._id, selectedMonth)
        .then((r) => setAttendanceData(r.data))
        .catch(() => {});
      fetchStudentFeesAPI(activeChild._id)
        .then((r) => setFeesData(r.data))
        .catch(() => {});
      fetchStudentTimetableAPI(activeChild._id)
        .then((r) => setTimetableData(r.data))
        .catch(() => {});
      fetchStudentNoticesAPI(activeChild._id)
        .then((r) => setNoticesData(r.data))
        .catch(() => {});
      fetchStudentExamsAPI(activeChild._id)
        .then((r) => setExamsData(r.data || []))
        .catch(() => {});
    } else if (activeTab === "attendance") {
      setIsLoadingAttendance(true);
      fetchStudentAttendanceAPI(activeChild._id, selectedMonth)
        .then((r) => setAttendanceData(r.data))
        .finally(() => setIsLoadingAttendance(false));
    } else if (activeTab === "fees") {
      setIsLoadingFees(true);
      fetchStudentFeesAPI(activeChild._id)
        .then((r) => setFeesData(r.data))
        .finally(() => setIsLoadingFees(false));
    } else if (activeTab === "timetable") {
      setIsLoadingTimetable(true);
      fetchStudentTimetableAPI(activeChild._id)
        .then((r) => setTimetableData(r.data))
        .finally(() => setIsLoadingTimetable(false));
    } else if (activeTab === "exams") {
      setIsLoadingExams(true);
      fetchStudentExamsAPI(activeChild._id)
        .then((r) => {
          setExamsData(r.data || []);
          if (r.data && r.data.length > 0) {
            setSelectedExamId(r.data[0].exam?._id || null);
          }
        })
        .finally(() => setIsLoadingExams(false));
    } else if (activeTab === "notices") {
      setIsLoadingNotices(true);
      fetchStudentNoticesAPI(activeChild._id)
        .then((r) => setNoticesData(r.data || []))
        .finally(() => setIsLoadingNotices(false));
    }
  }, [activeChild, activeTab, selectedMonth]);

  // Selected report card in exams tab
  const activeReportCard = useMemo(() => {
    if (!examsData.length) return null;
    if (selectedExamId) {
      return examsData.find((e) => e.exam?._id === selectedExamId) || examsData[0];
    }
    return examsData[0];
  }, [examsData, selectedExamId]);

  if (isLoadingChildren) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="mt-3 text-sm text-slate-500 font-medium">Loading family portal…</p>
      </div>
    );
  }

  if (!children.length) {
    return (
      <div className="card max-w-2xl mx-auto my-12 p-8 text-center">
        <EmptyState
          icon={School}
          title="No Student Records Linked"
          subtitle={
            user?.role === ROLES.PARENT
              ? "We could not find any students linked to your guardian profile. Please contact the school administration office to verify your registered phone number."
              : "No active student enrollment found for your account."
          }
        />
      </div>
    );
  }

  const isParent = user?.role === ROLES.PARENT;

  return (
    <div className="space-y-6">
      {/* ================= 1. FAMILY HEADER & CHILD SWITCHER ================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">
                {isParent ? "Parent & Guardian Portal" : "Student Academic Portal"}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500">Apex International School</span>
            </div>
            <h1 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
              {isParent ? "Family Overview" : `Welcome, ${activeChild.name}`}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Access real-time attendance, fee vouchers, weekly schedule, and published report cards.
            </p>
          </div>

          {/* Children Switcher Pills (If parent has multiple children) */}
          {children.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-1.5 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 px-2">Switch Child:</span>
              {children.map((c) => {
                const isSelected = c._id === activeChildId;
                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => setActiveChildId(c._id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? "bg-brand-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black uppercase ${
                        isSelected ? "bg-white/20 text-white" : "bg-brand-100 text-brand-700"
                      }`}
                    >
                      {c.name.slice(0, 1)}
                    </div>
                    <span>{c.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {c.enrollment?.className || "Grade"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Child Details Strip */}
        {activeChild && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-700 text-white flex items-center justify-center text-sm font-bold uppercase shadow-sm">
                {activeChild.name.slice(0, 2)}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">{activeChild.name}</p>
                <p className="text-slate-500">
                  Admission: <span className="font-mono font-semibold text-slate-700">{activeChild.admissionNo}</span>
                  {activeChild.enrollment?.rollNo && ` · Roll #${activeChild.enrollment.rollNo}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Enrolled Class
                </span>
                <span className="font-bold text-slate-800">
                  {activeChild.enrollment?.className} - Section {activeChild.enrollment?.sectionName}
                </span>
              </div>

              <div className="rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Class Teacher
                </span>
                <span className="font-bold text-slate-800">
                  {activeChild.enrollment?.classTeacher || "Assigned"}
                </span>
              </div>

              <div className="rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Session
                </span>
                <span className="font-bold text-brand-700">
                  {activeChild.enrollment?.academicYear || "Active Session"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= 2. PORTAL NAVIGATION TABS ================= */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-2 text-xs font-semibold">
        {[
          { id: "overview", label: "Overview", icon: School },
          { id: "attendance", label: "Attendance", icon: CalendarCheck },
          { id: "fees", label: "Fees & Invoices", icon: Wallet },
          { id: "timetable", label: "Weekly Schedule", icon: Clock },
          { id: "exams", label: "Exams & Results", icon: GraduationCap },
          { id: "notices", label: "Circulars & Notices", icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
                isActive
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= 3. TAB CONTENT ================= */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Attendance KPI */}
            <div className="card p-5 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</span>
                <CalendarCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {attendanceData?.summary?.attendanceRate || "0%"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {attendanceData?.summary?.presentDays || 0} of {attendanceData?.summary?.totalDays || 0} days present this month
              </p>
            </div>

            {/* Fee Status KPI */}
            <div className="card p-5 border-l-4 border-l-brand-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fee Balance</span>
                <Wallet className="h-5 w-5 text-brand-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">
                PKR {(feesData?.overview?.totalPending || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {feesData?.overview?.totalPending === 0 ? (
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 inline" /> All dues cleared
                  </span>
                ) : (
                  <span className="font-semibold text-amber-600">Pending payment</span>
                )}
              </p>
            </div>

            {/* Scheduled Classes Today */}
            <div className="card p-5 border-l-4 border-l-sky-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Schedule</span>
                <Clock className="h-5 w-5 text-sky-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {timetableData?.schedule?.monday?.length || 0} Periods
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Enrolled Section {activeChild.enrollment?.sectionName || "A"}
              </p>
            </div>

            {/* Published Results */}
            <div className="card p-5 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exam Results</span>
                <GraduationCap className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {examsData.length} Published
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {examsData.length > 0
                  ? `Latest: ${examsData[0].exam?.name || "Exam"}`
                  : "No exams published yet"}
              </p>
            </div>
          </div>

          {/* Quick Previews: Schedule & Announcements */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Today's Schedule Preview */}
            <div className="card p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Class Schedule</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("timetable")}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  Full Weekly Matrix <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              <div className="mt-4 space-y-2.5">
                {timetableData?.schedule?.monday?.length > 0 ? (
                  timetableData.schedule.monday.slice(0, 4).map((slot, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 font-bold text-brand-700">
                          P{slot.period}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{slot.subject}</p>
                          <p className="text-slate-500">{slot.teacher} · {slot.room || "Main Room"}</p>
                        </div>
                      </div>
                      <span className="font-mono font-semibold text-slate-600">
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No scheduled periods for today.</p>
                )}
              </div>
            </div>

            {/* School Circulars & Notices Preview */}
            <div className="card p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-purple-600" />
                  <h3 className="font-bold text-slate-900 text-sm">School Circulars & Notices</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("notices")}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  View All <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {noticesData.length > 0 ? (
                  noticesData.slice(0, 3).map((notice) => (
                    <div
                      key={notice._id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{notice.title}</span>
                        {notice.isPinned && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            PINNED
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-slate-600 line-clamp-2">{notice.body}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No active circulars at this time.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4 border border-slate-200">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Monthly Attendance Record</h2>
              <p className="text-xs text-slate-500">Daily roll-call register recorded by class teachers.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Select Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="input-field text-xs py-1.5"
              />
            </div>
          </div>

          {isLoadingAttendance ? (
            <div className="flex min-h-[250px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : (
            <>
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="card p-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Days</span>
                  <p className="mt-1 text-xl font-black text-slate-800">{attendanceData?.summary?.totalDays || 0}</p>
                </div>
                <div className="card p-4 text-center bg-emerald-50/50 border-emerald-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Present</span>
                  <p className="mt-1 text-xl font-black text-emerald-700">{attendanceData?.summary?.presentDays || 0}</p>
                </div>
                <div className="card p-4 text-center bg-rose-50/50 border-rose-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Absent</span>
                  <p className="mt-1 text-xl font-black text-rose-700">{attendanceData?.summary?.absentDays || 0}</p>
                </div>
                <div className="card p-4 text-center bg-amber-50/50 border-amber-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Late</span>
                  <p className="mt-1 text-xl font-black text-amber-700">{attendanceData?.summary?.lateDays || 0}</p>
                </div>
                <div className="card p-4 text-center bg-sky-50/50 border-sky-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Leave</span>
                  <p className="mt-1 text-xl font-black text-sky-700">{attendanceData?.summary?.leaveDays || 0}</p>
                </div>
              </div>

              {/* Attendance Log Table */}
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Daily Log</span>
                  <span className="text-xs font-semibold text-slate-500">
                    Monthly Percentage: <strong>{attendanceData?.summary?.attendanceRate || "0%"}</strong>
                  </span>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase">
                      <tr>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5 text-center">Status</th>
                        <th className="px-4 py-2.5">Teacher Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceData?.records?.length > 0 ? (
                        attendanceData.records.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {new Date(r.date).toLocaleDateString("en-GB", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 font-bold uppercase text-[10px] ${
                                  r.status === "Present"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : r.status === "Absent"
                                    ? "bg-rose-100 text-rose-800"
                                    : r.status === "Late"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-sky-100 text-sky-800"
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500">{r.remarks || "—"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                            No attendance records recorded for this month.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: FEES & INVOICES */}
      {activeTab === "fees" && (
        <div className="space-y-6">
          {/* Summary Balance Alert */}
          <div className="card p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs uppercase tracking-widest text-indigo-300 font-bold">
                  Fee Account Status
                </span>
                <h3 className="text-2xl font-black mt-1">
                  PKR {(feesData?.overview?.totalPending || 0).toLocaleString()} Outstanding
                </h3>
                <p className="text-xs text-indigo-200 mt-1">
                  Total Billed: PKR {(feesData?.overview?.totalDues || 0).toLocaleString()} · Total Paid: PKR {(feesData?.overview?.totalPaid || 0).toLocaleString()}
                </p>
              </div>

              {feesData?.overview?.totalPending === 0 ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="h-4 w-4" /> All fees up to date
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-amber-500/20 px-4 py-2 border border-amber-400/30 text-amber-300 text-xs font-bold">
                  <AlertCircle className="h-4 w-4" /> Dues pending payment
                </div>
              )}
            </div>
          </div>

          {/* Vouchers Table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fee Invoices</span>
              <span className="text-xs text-slate-500">Official printable receipts available</span>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Voucher #</th>
                    <th className="px-4 py-2.5">Month</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5 text-right">Paid</th>
                    <th className="px-4 py-2.5 text-right">Balance</th>
                    <th className="px-4 py-2.5 text-center">Due Date</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {feesData?.vouchers?.length > 0 ? (
                    feesData.vouchers.map((v) => (
                      <tr key={v._id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">{v.voucherNo}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{v.period}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          PKR {v.total?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                          PKR {v.paidAmount?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">
                          PKR {v.balance?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500">{v.dueDate || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 font-bold uppercase text-[10px] ${
                              v.status === "paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : v.status === "partial"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedVoucherForReceipt(v)}
                            className="btn-secondary text-[11px] py-1 px-2.5"
                          >
                            <Receipt className="h-3 w-3" />
                            <span>Receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        No fee vouchers on file for this student.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TIMETABLE */}
      {activeTab === "timetable" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4 border border-slate-200">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                Weekly Class Schedule · Section {activeChild.enrollment?.sectionName}
              </h2>
              <p className="text-xs text-slate-500">
                Lessons and faculty assignments for {activeChild.enrollment?.className}.
              </p>
            </div>

            {/* Day Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                    selectedDay === day
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {isLoadingTimetable ? (
            <div className="flex min-h-[250px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {selectedDay.toUpperCase()} Schedule
                </span>
                <span className="text-xs font-semibold text-brand-600">
                  {timetableData?.schedule?.[selectedDay]?.length || 0} Scheduled Periods
                </span>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Period</th>
                      <th className="px-4 py-2.5">Timing</th>
                      <th className="px-4 py-2.5">Subject</th>
                      <th className="px-4 py-2.5">Teacher</th>
                      <th className="px-4 py-2.5 text-right">Classroom</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {timetableData?.schedule?.[selectedDay]?.length > 0 ? (
                      timetableData.schedule[selectedDay].map((slot, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-brand-700">Period {slot.period}</td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-600">
                            {slot.startTime} - {slot.endTime}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">{slot.subject}</td>
                          <td className="px-4 py-3 text-slate-600">{slot.teacher}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-500">
                            {slot.room || "Main Hall"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          No classes scheduled for {selectedDay}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: EXAMS & RESULTS */}
      {activeTab === "exams" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4 border border-slate-200">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Published Academic Report Cards</h2>
              <p className="text-xs text-slate-500">
                Official marks sheets, grade calculation, and class position rankings.
              </p>
            </div>

            {examsData.length > 0 && (
              <div className="flex items-center gap-3">
                <select
                  value={selectedExamId || ""}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="input-field text-xs py-1.5"
                >
                  {examsData.map((e) => (
                    <option key={e.exam?._id} value={e.exam?._id}>
                      {e.exam?.name} ({e.exam?.termName})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-primary text-xs py-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Report Card</span>
                </button>
              </div>
            )}
          </div>

          {isLoadingExams ? (
            <div className="flex min-h-[250px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : !activeReportCard ? (
            <div className="card p-8 text-center">
              <EmptyState
                icon={GraduationCap}
                title="No Exam Results Published Yet"
                subtitle="When examination marks are locked and published by the administration, your official report card will appear here."
              />
            </div>
          ) : (
            <div
              className="card p-8 bg-white border border-slate-200 shadow-md font-sans"
              id="printable-report-card"
            >
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-5 text-center">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  APEX INTERNATIONAL SCHOOL
                </h1>
                <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mt-1">
                  Official Academic Achievement Report Card
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                  <span>{activeReportCard.exam?.name}</span>
                  <span>·</span>
                  <span>{activeReportCard.exam?.termName}</span>
                </div>
              </div>

              {/* Student Metadata */}
              <div className="grid grid-cols-2 gap-4 py-5 border-b border-slate-200 text-xs sm:grid-cols-4">
                <div>
                  <span className="text-slate-400 font-medium">Student Name:</span>
                  <p className="font-bold text-slate-900 text-sm">{activeReportCard.student?.name}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Admission / Roll #:</span>
                  <p className="font-bold text-slate-900 text-sm">
                    {activeReportCard.student?.admissionNo} (Roll #{activeReportCard.student?.rollNo})
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Class & Section:</span>
                  <p className="font-bold text-slate-900 text-sm">
                    {activeReportCard.student?.className} - {activeReportCard.student?.sectionName}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Guardian Name:</span>
                  <p className="font-bold text-slate-900 text-sm">
                    {activeReportCard.student?.guardianName || "Guardian"}
                  </p>
                </div>
              </div>

              {/* Subject Results Table */}
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
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activeReportCard.subjects?.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">{sub.subjectName}</td>
                        <td className="p-3 text-center text-slate-600 font-mono">{sub.totalMarks}</td>
                        <td className="p-3 text-center text-slate-600 font-mono">{sub.passingMarks}</td>
                        <td className="p-3 text-center font-bold text-slate-900 font-mono">
                          {sub.isAbsent ? "ABS" : sub.marksObtained}
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-700">
                          {sub.isAbsent ? "—" : `${sub.percentage}%`}
                        </td>
                        <td className="p-3 text-center font-bold text-brand-700">{sub.grade}</td>
                        <td className="p-3 text-right">
                          <span
                            className={`badge ${
                              sub.isPassed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {sub.isPassed ? "Passed" : "Needs Review"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Final Summary Card */}
              <div className="mt-2 rounded-xl bg-slate-50 p-6 border border-slate-200">
                <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Marks</span>
                    <p className="text-xl font-black text-slate-900 mt-0.5">
                      {activeReportCard.grandTotalObtained} / {activeReportCard.grandTotalMax}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Overall Percentage</span>
                    <p className="text-xl font-black text-brand-600 mt-0.5">
                      {activeReportCard.overallPercentage}%
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Overall Grade</span>
                    <p className="text-xl font-black text-brand-700 mt-0.5">
                      {activeReportCard.overallGrade}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Class Position</span>
                    <p className="text-xl font-black text-amber-600 mt-0.5">
                      Rank #{activeReportCard.classPosition || 1}
                    </p>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-12 flex justify-between pt-8 border-t border-slate-200 text-xs text-slate-500 font-semibold">
                <div>
                  <div className="w-40 border-b border-slate-400 mb-1"></div>
                  <span>Class Teacher Signature</span>
                </div>
                <div>
                  <div className="w-40 border-b border-slate-400 mb-1"></div>
                  <span>Principal Signature</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: NOTICES */}
      {activeTab === "notices" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-white p-4 border border-slate-200">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">School Circulars & Announcements</h2>
              <p className="text-xs text-slate-500">Official updates from school management and teachers.</p>
            </div>
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
              {noticesData.length} Announcements
            </span>
          </div>

          {isLoadingNotices ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : noticesData.length > 0 ? (
            <div className="space-y-3">
              {noticesData.map((n) => (
                <div
                  key={n._id}
                  className={`card p-5 border-l-4 ${
                    n.isPinned ? "border-l-amber-500 bg-amber-50/10" : "border-l-brand-500"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{n.title}</h3>
                        {n.isPinned && (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            PINNED
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed whitespace-pre-line">{n.body}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {n.publishedAt ? new Date(n.publishedAt).toLocaleDateString() : ""}
                    </span>
                  </div>

                  {n.attachmentUrl && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <a
                        href={n.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>View Attachment</span>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <EmptyState
                icon={Bell}
                title="No Active Notices"
                subtitle="There are no school announcements targeted for this student right now."
              />
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: PRINTABLE FEE RECEIPT ================= */}
      <Modal
        open={!!selectedVoucherForReceipt}
        onClose={() => setSelectedVoucherForReceipt(null)}
        title="Fee Payment Receipt"
        subtitle={`Voucher ${selectedVoucherForReceipt?.voucherNo}`}
        size="md"
      >
        {selectedVoucherForReceipt && (
          <div className="space-y-5 text-xs" id="printable-fee-receipt">
            <div className="border-b border-slate-200 pb-3 text-center">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">APEX INTERNATIONAL SCHOOL</h2>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Official Fee Receipt</p>
              <div className="mt-1 inline-block rounded bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                {selectedVoucherForReceipt.voucherNo}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 font-medium">Student:</span>
                <p className="font-bold text-slate-800">{activeChild?.name}</p>
                <p className="text-slate-500">{activeChild?.admissionNo}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Class:</span>
                <p className="font-bold text-slate-800">
                  {activeChild?.enrollment?.className} - {activeChild?.enrollment?.sectionName}
                </p>
                <p className="text-slate-500">Period: {selectedVoucherForReceipt.period}</p>
              </div>
            </div>

            {/* Fee Items */}
            <div className="border rounded-xl border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedVoucherForReceipt.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-medium text-slate-700">{item.name}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                        PKR {item.amount?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td className="p-2.5 text-slate-800">Total Billed</td>
                    <td className="p-2.5 text-right font-mono text-slate-900">
                      PKR {selectedVoucherForReceipt.total?.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/50 font-bold text-emerald-800">
                    <td className="p-2.5">Paid Amount</td>
                    <td className="p-2.5 text-right font-mono">
                      PKR {selectedVoucherForReceipt.paidAmount?.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="bg-rose-50/50 font-bold text-rose-800">
                    <td className="p-2.5">Remaining Balance</td>
                    <td className="p-2.5 text-right font-mono">
                      PKR {selectedVoucherForReceipt.balance?.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Receipts Log */}
            {selectedVoucherForReceipt.payments?.length > 0 && (
              <div>
                <p className="font-bold text-slate-700 mb-1.5">Payment Transactions</p>
                <div className="space-y-1.5">
                  {selectedVoucherForReceipt.payments.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100 font-mono text-[11px]"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{p.receiptNo}</span>
                        <span className="text-slate-400 mx-1">·</span>
                        <span className="capitalize text-slate-600">{p.method}</span>
                      </div>
                      <span className="font-bold text-emerald-600">PKR {p.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-primary text-xs py-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedVoucherForReceipt(null)}
                className="btn-secondary text-xs py-1.5"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

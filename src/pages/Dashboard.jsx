import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  GraduationCap,
  CalendarCheck,
  Wallet,
  UserPlus,
  CheckSquare,
  DollarSign,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Clock,
  BookOpen,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import StatCard from "../components/StatCard";
import { formatPKR } from "../data/mock";
import { useAuth } from "../lib/auth-context";
import { ROLES } from "../lib/permissions";
import { fetchDashboardStatsAPI } from "../lib/reports-api";
import Portal from "./Portal";

const ACTIVITY_ICON = {
  fee: { icon: Wallet, color: "text-emerald-600 bg-emerald-50" },
  admission: { icon: UserPlus, color: "text-brand-600 bg-brand-50" },
  feepayment: { icon: Wallet, color: "text-emerald-600 bg-emerald-50" },
  student: { icon: UserPlus, color: "text-brand-600 bg-brand-50" },
  attendance: { icon: CalendarCheck, color: "text-sky-600 bg-sky-50" },
  exam: { icon: GraduationCap, color: "text-amber-600 bg-amber-50" },
  notice: { icon: BookOpen, color: "text-purple-600 bg-purple-50" },
  timetableslot: { icon: Clock, color: "text-indigo-600 bg-indigo-50" },
  activity: { icon: Activity, color: "text-slate-600 bg-slate-100" },
};

export default function Dashboard({
  students = [],
  onNavigate,
  onNewAdmission,
  onMarkAttendance,
  onCollectFee,
}) {
  const { user } = useAuth();

  if (user?.role === ROLES.PARENT || user?.role === ROLES.STUDENT) {
    return <Portal />;
  }

  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load Real Dashboard Aggregates
  const loadStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetchDashboardStatsAPI();
      if (res?.data) {
        setStats(res.data);
      }
    } catch (_err) {
      // Offline fallback state will be used
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const isAdmin = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;
  const isTeacher = user?.role === ROLES.TEACHER;
  const isAccountant = user?.role === ROLES.ACCOUNTANT;

  // Overview metrics derived from live backend stats or props fallback
  const overview = stats?.overview || {};
  const totalStudents = overview.totalStudents !== undefined ? overview.totalStudents : students.length;
  const totalStaff = overview.totalStaff !== undefined ? overview.totalStaff : 18;
  const todayRate = overview.todayAttendanceRate || "0%";
  const monthlyCollected = overview.monthlyFeeCollected || 0;

  // 6-Month Fee Collections Chart Data
  const monthlyCollections = useMemo(() => {
    if (stats?.monthlyCollections && stats.monthlyCollections.length > 0) {
      return stats.monthlyCollections;
    }
    return [
      { month: "Nov", amount: 65000 },
      { month: "Dec", amount: 72000 },
      { month: "Jan", amount: 78000 },
      { month: "Feb", amount: 84000 },
      { month: "Mar", amount: 92000 },
      { month: "Apr", amount: 88000 },
    ];
  }, [stats]);

  const maxCol = Math.max(...monthlyCollections.map((m) => m.amount), 1);

  // Recent Activity Feed
  const recentActivities = useMemo(() => {
    if (stats?.recentActivity && stats.recentActivity.length > 0) {
      return stats.recentActivity;
    }
    return [
      {
        id: "1",
        title: "Fee Payment Collected",
        detail: "Voucher #VCH-2026-0012 cleared",
        time: "Today",
        type: "feepayment",
      },
      {
        id: "2",
        title: "Section Attendance Recorded",
        detail: "Grade 10 - Sec A marked present",
        time: "Today",
        type: "attendance",
      },
      {
        id: "3",
        title: "New Admission Registered",
        detail: "Student enrolled in Grade 5",
        time: "Yesterday",
        type: "student",
      },
    ];
  }, [stats]);

  const quickActions = [
    {
      id: "attendance",
      label: "Mark Attendance",
      icon: CheckSquare,
      desc: "Daily section roll-call",
      color: "from-sky-500 to-sky-600",
      onClick: onMarkAttendance,
    },
    {
      id: "fee",
      label: "Collect Fee",
      icon: DollarSign,
      desc: "Record voucher payment",
      color: "from-emerald-500 to-emerald-600",
      onClick: onCollectFee,
    },
    {
      id: "student",
      label: "Add Student",
      icon: UserPlus,
      desc: "New admission form",
      color: "from-brand-500 to-brand-600",
      onClick: onNewAdmission,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back, {user?.name || "Administrator"}. Here's the live school status for today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadStats}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800">
            <TrendingUp className="h-4 w-4" />
            <span>Active Session 2025–2026</span>
          </div>
        </div>
      </div>

      {/* Role-Specific Metric Cards */}
      {isTeacher ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Users}
            label="My Assigned Students"
            value={overview.myStudentsCount || 0}
            delta="Active"
            deltaType="up"
            accent="brand"
            footer="Enrolled in your classes"
          />
          <StatCard
            icon={GraduationCap}
            label="My Sections"
            value={overview.mySectionsCount || 0}
            delta="Assigned"
            deltaType="up"
            accent="emerald"
            footer="Class & Subject teaching"
          />
          <StatCard
            icon={Clock}
            label="Lessons Today"
            value={overview.scheduledLessonsToday || 0}
            delta={overview.todayDay || "TODAY"}
            deltaType="up"
            accent="sky"
            footer="Scheduled in timetable"
          />
          <StatCard
            icon={CalendarCheck}
            label="Attendance Ready"
            value="30 Sec"
            delta="Fast"
            deltaType="up"
            accent="amber"
            footer="One-click section roll-call"
          />
        </div>
      ) : isAccountant ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Wallet}
            label="Collected This Month"
            value={formatPKR(overview.totalCollected || 0)}
            delta={overview.collectionRate || "0%"}
            deltaType="up"
            accent="emerald"
            footer={`Period: ${overview.currentPeriod || "Current"}`}
          />
          <StatCard
            icon={DollarSign}
            label="Pending Balance"
            value={formatPKR(overview.totalPending || 0)}
            delta="Dues"
            deltaType="down"
            accent="amber"
            footer="Outstanding student fees"
          />
          <StatCard
            icon={AlertTriangle}
            label="Fee Defaulters"
            value={overview.defaultersCount || 0}
            delta="Overdue"
            deltaType="down"
            accent="brand"
            footer="Action required: send reminder"
          />
          <StatCard
            icon={CheckSquare}
            label="Total Vouchers"
            value={overview.totalVouchers || 0}
            delta="Issued"
            deltaType="up"
            accent="sky"
            footer="Current billing cycle"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Users}
            label="Total Students"
            value={totalStudents}
            delta="Enrolled"
            deltaType="up"
            accent="brand"
            footer="Active enrolled students"
          />
          <StatCard
            icon={GraduationCap}
            label="Active Staff"
            value={totalStaff}
            delta="Faculty"
            deltaType="up"
            accent="emerald"
            footer="Teachers & operational staff"
          />
          <StatCard
            icon={CalendarCheck}
            label="Today's Attendance"
            value={todayRate}
            delta={overview.todayPresentCount ? `${overview.todayPresentCount} present` : "Today"}
            deltaType="up"
            accent="sky"
            footer={`${overview.todayTotalMarked || 0} students recorded`}
          />
          <StatCard
            icon={Wallet}
            label="Monthly Revenue"
            value={formatPKR(monthlyCollected)}
            delta={overview.currentPeriod || "Month"}
            deltaType="up"
            accent="amber"
            footer={`Pending: ${formatPKR(overview.monthlyFeePending || 0)}`}
          />
        </div>
      )}

      {/* Teacher's Schedule Today (If Teacher logged in) */}
      {isTeacher && stats?.todaySchedule && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Today's Class Schedule</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Your scheduled periods for today</p>
            </div>
            <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {stats.todaySchedule.length} lessons
            </span>
          </div>

          {stats.todaySchedule.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">No teaching periods scheduled today.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              {stats.todaySchedule.map((slot) => (
                <div key={slot._id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-400">
                    <span>Period {slot.period}</span>
                    <span>{slot.startTime} - {slot.endTime}</span>
                  </div>
                  <p className="mt-1 font-bold text-slate-800 text-sm dark:text-slate-100">
                    {slot.subjectId?.name || "Subject"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {slot.classId?.name} — Section {slot.sectionId?.name}
                  </p>
                  {slot.room && <p className="text-[10px] text-slate-400 mt-0.5">{slot.room}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Charts & Feed Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 6-Month Collection Bar Chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Monthly Fee Collection</h3>
              <p className="text-xs text-slate-500">Last 6 months trend · in PKR</p>
            </div>
            <span className="badge bg-brand-50 text-brand-700 ring-1 ring-brand-200">
              <TrendingUp className="h-3 w-3" /> Real-time
            </span>
          </div>

          <div className="mt-6 flex h-52 items-end justify-between gap-3 sm:gap-4">
            {monthlyCollections.map((m) => {
              const h = Math.round((m.amount / maxCol) * 100);
              return (
                <div key={m.period || m.month} className="group flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-brand-500 to-brand-400 transition-all duration-300 group-hover:from-brand-600 group-hover:to-brand-500"
                      style={{ height: `${Math.max(h, 4)}%` }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100 shadow-md pointer-events-none">
                        {formatPKR(m.amount)}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real Activity Feed */}
        <div className="card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Recent School Activity</h3>
            </div>
            <div className="mt-4 space-y-2">
              {recentActivities.map((a) => {
                const cfg = ACTIVITY_ICON[a.type] || ACTIVITY_ICON.activity;
                const Icon = cfg.icon;
                return (
                  <div key={a.id} className="flex gap-3 rounded-xl p-2 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="truncate font-semibold text-slate-800 dark:text-slate-200">{a.title}</p>
                      <p className="truncate text-slate-500 text-[11px] dark:text-slate-400">{a.detail}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">{a.time}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {onNavigate && (
            <button
              onClick={() => onNavigate("reports")}
              className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span>View Detailed Reports</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h3 className="mb-3 text-base font-bold text-slate-900 dark:text-slate-100">Operational Shortcuts</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.id}
                onClick={qa.onClick}
                className="card group flex items-center gap-4 p-5 text-left transition-all duration-200 hover:shadow-cardhover hover:-translate-y-0.5"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${qa.color} text-white shadow-sm`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 dark:text-slate-100">{qa.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{qa.desc}</p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-slate-300 transition group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import React from "react";
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
} from "lucide-react";
import StatCard from "../components/StatCard";
import { RECENT_ACTIVITY, MONTHLY_COLLECTION, STUDENTS, TEACHERS, formatPKR } from "../data/mock";

const ACTIVITY_ICON = {
  fee: { icon: Wallet, color: "text-emerald-600 bg-emerald-50" },
  admission: { icon: UserPlus, color: "text-brand-600 bg-brand-50" },
  attendance: { icon: CalendarCheck, color: "text-sky-600 bg-sky-50" },
  exam: { icon: GraduationCap, color: "text-amber-600 bg-amber-50" },
};

export default function Dashboard({ students, onNavigate, onNewAdmission, onMarkAttendance, onCollectFee }) {
  const totalStudents = students.length;
  const activeTeachers = TEACHERS.filter((t) => t.status === "Active").length;
  const presentToday = Math.round(totalStudents * 0.92);
  const attendanceRate = Math.round((presentToday / totalStudents) * 100);
  const monthlyCollected = MONTHLY_COLLECTION[MONTHLY_COLLECTION.length - 1].amount;
  const maxCol = Math.max(...MONTHLY_COLLECTION.map((m) => m.amount));

  const quickActions = [
    { label: "Mark Attendance", icon: CheckSquare, desc: "Daily attendance sheet", color: "from-sky-500 to-sky-600", onClick: onMarkAttendance },
    { label: "Collect Fee", icon: DollarSign, desc: "Record a payment", color: "from-emerald-500 to-emerald-600", onClick: onCollectFee },
    { label: "Add Student", icon: UserPlus, desc: "New admission form", color: "from-brand-500 to-brand-600", onClick: onNewAdmission },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome back, Admin. Here's what's happening at Apex today.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
          <TrendingUp className="h-4 w-4" />
          Enrollment up 12.4% this term
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total Students" value={totalStudents} delta="12.4%" deltaType="up" accent="brand" footer={`${STUDENTS.length} enrolled this year`} />
        <StatCard icon={GraduationCap} label="Active Teachers" value={activeTeachers} delta="2 new" deltaType="up" accent="emerald" footer={`${TEACHERS.length} total staff`} />
        <StatCard icon={CalendarCheck} label="Today's Attendance" value={`${attendanceRate}%`} delta="3.1%" deltaType="up" accent="sky" footer={`${presentToday} of ${totalStudents} present`} />
        <StatCard icon={Wallet} label="Fee Collection (Oct)" value={formatPKR(monthlyCollected)} delta="8.5%" deltaType="up" accent="amber" footer="Target: PKR 90,000" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Monthly Fee Collection</h3>
              <p className="text-sm text-slate-500">Last 6 months · in PKR</p>
            </div>
            <span className="badge bg-brand-50 text-brand-700 ring-1 ring-brand-200">
              <TrendingUp className="h-3 w-3" /> Trending up
            </span>
          </div>
          <div className="mt-6 flex h-52 items-end justify-between gap-3 sm:gap-4">
            {MONTHLY_COLLECTION.map((m) => {
              const h = Math.round((m.amount / maxCol) * 100);
              return (
                <div key={m.month} className="group flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-brand-500 to-brand-400 transition-all duration-300 group-hover:from-brand-600 group-hover:to-brand-500"
                      style={{ height: `${h}%` }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                        {formatPKR(m.amount)}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-500">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-500" />
            <h3 className="text-base font-semibold text-slate-900">Recent Activity</h3>
          </div>
          <div className="mt-4 space-y-1">
            {RECENT_ACTIVITY.map((a, i) => {
              const cfg = ACTIVITY_ICON[a.type];
              const Icon = cfg.icon;
              return (
                <div key={a.id} className="flex gap-3 rounded-xl p-2.5 transition hover:bg-slate-50">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{a.title}</p>
                    <p className="truncate text-xs text-slate-500">{a.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{a.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-base font-semibold text-slate-900">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.label}
                onClick={qa.onClick}
                className="card group flex items-center gap-4 p-5 text-left transition-all duration-200 hover:shadow-cardhover hover:-translate-y-0.5"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${qa.color} text-white shadow-sm`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{qa.label}</p>
                  <p className="text-sm text-slate-500">{qa.desc}</p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-slate-300 transition group-hover:text-slate-500" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

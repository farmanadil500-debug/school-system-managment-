import React from "react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  Wallet,
  ClipboardList,
  Settings as SettingsIcon,
  ChevronLeft,
  School,
} from "lucide-react";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "students", label: "Students", icon: Users },
  { id: "teachers", label: "Teachers", icon: GraduationCap },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "fees", label: "Fees", icon: Wallet },
  { id: "exams", label: "Exams & Results", icon: ClipboardList },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export default function Sidebar({ active, onNavigate, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden animate-fade-in" onClick={onCloseMobile} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 lg:static lg:translate-x-0
          ${collapsed ? "lg:w-[76px]" : "lg:w-[260px]"}
          ${mobileOpen ? "w-[280px] translate-x-0" : "-translate-x-full w-[280px] lg:translate-x-0"}
        `}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <School className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-fade-in">
              <p className="truncate text-sm font-bold text-slate-900">Apex International</p>
              <p className="truncate text-xs text-slate-500">School Management</p>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="ml-auto hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:block"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={collapsed ? item.label : undefined}
                className={`nav-link w-full ${isActive ? "nav-link-active" : ""} ${collapsed ? "lg:justify-center" : ""}`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-brand-600" : "text-slate-400"}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {isActive && !collapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />}
              </button>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="border-t border-slate-100 p-4 animate-fade-in">
            <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-slate-50 p-4 ring-1 ring-brand-100">
              <p className="text-xs font-semibold text-brand-700">Academic Year</p>
              <p className="mt-1 text-sm font-bold text-slate-800">2026–2027 · Term 1</p>
              <p className="mt-1 text-xs text-slate-500">82 school days remaining</p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

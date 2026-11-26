import React from "react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  Wallet,
  ClipboardList,
  Clock,
  Bell,
  Settings as SettingsIcon,
  ChevronLeft,
  School,
  UserCog,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { ROLES } from "../lib/permissions";

const ALL_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: Object.values(ROLES) },
  { id: "portal", label: "Family Portal", icon: School, roles: [ROLES.PARENT, ROLES.STUDENT, ROLES.SUPER_ADMIN, ROLES.ADMIN] },
  { id: "students", label: "Students", icon: Users, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER] },
  { id: "teachers", label: "Teachers", icon: GraduationCap, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
  { id: "attendance", label: "Attendance", icon: CalendarCheck, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT] },
  { id: "fees", label: "Fees", icon: Wallet, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.STUDENT, ROLES.PARENT] },
  { id: "exams", label: "Exams & Results", icon: ClipboardList, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT] },
  { id: "timetable", label: "Timetable", icon: Clock, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT] },
  { id: "reports", label: "Reports & Analytics", icon: BarChart3, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.ACCOUNTANT] },
  { id: "notices", label: "Notice Board", icon: Bell, roles: Object.values(ROLES) },
  { id: "users", label: "Users & Roles", icon: UserCog, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
  { id: "settings", label: "Settings", icon: SettingsIcon, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.ACCOUNTANT] },
];

export default function Sidebar({ active, onNavigate, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { user } = useAuth();

  const userRole = user?.role || ROLES.SUPER_ADMIN;
  const filteredNav = ALL_NAV_ITEMS.filter((item) => item.roles.includes(userRole)).map((item) => {
    if (item.id === "portal") {
      return {
        ...item,
        label:
          userRole === ROLES.PARENT
            ? "Parent Portal"
            : userRole === ROLES.STUDENT
            ? "Student Portal"
            : "Family Portal",
      };
    }
    return item;
  });

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden animate-fade-in" onClick={onCloseMobile} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full flex-col shrink-0 border-r border-slate-200 bg-white transition-all duration-300 lg:static lg:h-screen lg:translate-x-0 dark:border-slate-800 dark:bg-slate-900
          ${collapsed ? "lg:w-[76px]" : "lg:w-[260px]"}
          ${mobileOpen ? "w-[280px] translate-x-0" : "-translate-x-full w-[280px] lg:translate-x-0"}
        `}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <School className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-fade-in">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">Apex International</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">School Management</p>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="ml-auto hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:block dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {filteredNav.map((item) => {
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
      </aside>
    </>
  );
}

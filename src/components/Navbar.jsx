import React from "react";
import { Search, Menu, Plus, CalendarDays, Bell, LogOut, Sun, Moon } from "lucide-react";
import { ACADEMIC_SESSION } from "../data/mock";
import { useAuth } from "../lib/auth-context";
import { useTheme } from "../lib/theme-context";
import { ROLE_LABELS, can } from "../lib/permissions";

export default function Navbar({ onOpenMobile, onNewAdmission, query, onQueryChange, onNavigate }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md transition-colors lg:px-6 dark:border-slate-800 dark:bg-slate-900/80">
      <button
        onClick={onOpenMobile}
        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search students, teachers, fees…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 transition dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800 dark:focus:border-brand-400 dark:focus:ring-brand-900/50"
        />
      </div>

      <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm font-medium text-slate-600 md:flex dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
        <CalendarDays className="h-4 w-4 text-brand-500 dark:text-brand-400" />
        <span>{ACADEMIC_SESSION}</span>
      </div>

      {can(user, "students:create") && (
        <button
          onClick={onNewAdmission}
          className="btn-primary hidden sm:inline-flex"
        >
          <Plus className="h-4 w-4" />
          New Admission
        </button>
      )}

      {/* Theme Toggle Button (Previous Single Icon as requested) */}
      <button
        type="button"
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5 text-amber-400 transition-transform duration-300 hover:rotate-45" />
        ) : (
          <Moon className="h-5 w-5 text-slate-600 transition-transform duration-300 hover:-rotate-12 dark:text-slate-300" />
        )}
      </button>

      <button className="relative hidden rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 sm:block dark:text-slate-400 dark:hover:bg-slate-800">
        <Bell className="h-5 w-5" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
      </button>

      {/* User Info & Quick Logout */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate("settings")}
          className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-2.5 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/80"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-indigo-700 text-xs font-bold text-white uppercase shadow-sm">
            {user?.email?.slice(0, 2) || user?.role?.slice(0, 2) || "U"}
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold leading-tight text-slate-800 dark:text-slate-200">
              {user?.email?.split("@")[0] || user?.phone || "User Profile"}
            </p>
            <p className="text-xs leading-tight text-slate-500 dark:text-slate-400">
              {ROLE_LABELS[user?.role] || user?.role}
            </p>
          </div>
        </button>

        <button
          onClick={logout}
          title="Sign out"
          className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition dark:border-slate-700 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

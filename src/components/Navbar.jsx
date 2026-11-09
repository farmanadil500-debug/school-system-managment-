import React from "react";
import { Search, Menu, Plus, CalendarDays, Bell, ChevronDown } from "lucide-react";
import { ACADEMIC_SESSION } from "../data/mock";

export default function Navbar({ onOpenMobile, onNewAdmission, query, onQueryChange, onNavigate }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md lg:px-6">
      <button
        onClick={onOpenMobile}
        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search students, teachers, fees…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 transition"
        />
      </div>

      <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm font-medium text-slate-600 md:flex">
        <CalendarDays className="h-4 w-4 text-brand-500" />
        <span>{ACADEMIC_SESSION}</span>
      </div>

      <button
        onClick={onNewAdmission}
        className="btn-primary hidden sm:inline-flex"
      >
        <Plus className="h-4 w-4" />
        New Admission
      </button>

      <button className="relative hidden rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 sm:block">
        <Bell className="h-5 w-5" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
      </button>

      <button
        onClick={() => onNavigate("settings")}
        className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-2 transition hover:bg-slate-50"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
          AD
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-semibold leading-tight text-slate-800">Admin Dean</p>
          <p className="text-xs leading-tight text-slate-500">Administrator</p>
        </div>
        <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
      </button>
    </header>
  );
}

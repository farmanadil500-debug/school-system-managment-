import React, { useMemo, useState } from "react";
import { GraduationCap, Search, Mail, Phone, Briefcase, Award } from "lucide-react";
import { Avatar, EmptyState, SectionHeader, StatusBadge } from "../components/ui";
import { TEACHERS, SUBJECTS } from "../data/mock";

export default function Teachers({ globalQuery }) {
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All");

  const filtered = useMemo(() => {
    const q = (globalQuery || search || "").toLowerCase();
    return TEACHERS.filter((t) => {
      const mq = !q || t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q);
      const ms = subjectFilter === "All" || t.subject === subjectFilter;
      return mq && ms;
    });
  }, [globalQuery, search, subjectFilter]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Teachers"
        subtitle={`${TEACHERS.length} staff members · Academic faculty directory`}
        action={<span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">{TEACHERS.filter((t) => t.status === "Active").length} Active</span>}
      />

      <div className="card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={globalQuery || search} onChange={(e) => setSearch(e.target.value)} placeholder="Search teachers…" className="input pl-10" disabled={!!globalQuery} />
          </div>
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="input w-auto">
            <option>All</option>
            {[...new Set(TEACHERS.map((t) => t.subject))].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><EmptyState icon={GraduationCap} title="No teachers found" subtitle="Adjust your search to find staff members." /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <div key={t.id} className="card group p-5 transition-shadow duration-200 hover:shadow-cardhover">
              <div className="flex items-start gap-4">
                <Avatar name={t.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{t.name}</p>
                  <p className="flex items-center gap-1.5 text-sm text-slate-500"><Briefcase className="h-3.5 w-3.5" /> {t.subject}</p>
                  <div className="mt-2"><StatusBadge status={t.status} /></div>
                </div>
              </div>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                <p className="flex items-center gap-2 text-slate-600"><Mail className="h-4 w-4 text-slate-400" /> {t.email}</p>
                <p className="flex items-center gap-2 text-slate-600"><Phone className="h-4 w-4 text-slate-400" /> {t.phone}</p>
                <p className="flex items-center gap-2 text-slate-600"><Award className="h-4 w-4 text-slate-400" /> {t.qualification} · {t.experience}</p>
                <p className="text-slate-600">Class teacher: <span className="font-medium text-slate-800">{t.class}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

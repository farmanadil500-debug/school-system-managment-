import React from "react";

export function StatusBadge({ status }) {
  const styles = {
    Active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Inactive: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    "On Leave": "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  };
  return <span className={`badge ${styles[status] || styles.Inactive}`}>{status}</span>;
}

export function Avatar({ name, size = "md" }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };
  const palette = ["from-brand-500 to-brand-700", "from-emerald-500 to-emerald-700", "from-sky-500 to-sky-700", "from-amber-500 to-amber-700", "from-rose-500 to-rose-700"];
  const idx = name.charCodeAt(0) % palette.length;
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${palette[idx]} font-semibold text-white ${sizes[size]}`}>
      {initials}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{subtitle}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

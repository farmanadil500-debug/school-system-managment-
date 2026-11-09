import React from "react";

export default function StatCard({ icon: Icon, label, value, delta, deltaType = "up", accent = "brand", footer }) {
  const accents = {
    brand: "from-brand-500 to-brand-700 text-white",
    emerald: "from-emerald-500 to-emerald-600 text-white",
    amber: "from-amber-500 to-amber-600 text-white",
    sky: "from-sky-500 to-sky-600 text-white",
  };
  const deltaColor =
    deltaType === "up" ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50";

  return (
    <div className="card group p-5 transition-shadow duration-200 hover:shadow-cardhover">
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accents[accent]} shadow-sm`}>
          <Icon className="h-5 w-5" />
        </div>
        {delta && (
          <span className={`badge ${deltaColor}`}>{deltaType === "up" ? "▲" : "▼"} {delta}</span>
        )}
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {footer && <p className="mt-2 text-xs text-slate-400">{footer}</p>}
    </div>
  );
}

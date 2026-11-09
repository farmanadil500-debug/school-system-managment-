import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, Info, X, AlertTriangle } from "lucide-react";

const ToastCtx = createContext(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const STYLES = {
  success: { icon: CheckCircle2, ring: "ring-emerald-200", bar: "bg-emerald-500", iconColor: "text-emerald-500" },
  info: { icon: Info, ring: "ring-brand-200", bar: "bg-brand-500", iconColor: "text-brand-500" },
  warning: { icon: AlertTriangle, ring: "ring-amber-200", bar: "bg-amber-500", iconColor: "text-amber-500" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message, type = "success") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => remove(id), 3200);
    },
    [remove]
  );

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((t) => {
          const s = STYLES[t.type] || STYLES.success;
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl bg-white p-4 shadow-cardhover ring-1 ${s.ring} animate-toast-in`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.iconColor}`} />
              <p className="flex-1 text-sm font-medium text-slate-700">{t.message}</p>
              <button onClick={() => remove(t.id)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

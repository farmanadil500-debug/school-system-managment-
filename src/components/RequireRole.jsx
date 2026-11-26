import React from "react";
import { useAuth } from "../lib/auth-context";
import { ShieldAlert } from "lucide-react";

export default function RequireRole({ roles = [], children, fallback = null }) {
  const { user } = useAuth();

  if (!user) return null;

  const hasAccess = roles.length === 0 || roles.includes(user.role);

  if (!hasAccess) {
    if (fallback) return fallback;

    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-8 ring-amber-50/50 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Access Restricted</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Your account role (<span className="font-semibold text-slate-700">{user.role}</span>) does not have permission to view this section.
        </p>
      </div>
    );
  }

  return children;
}


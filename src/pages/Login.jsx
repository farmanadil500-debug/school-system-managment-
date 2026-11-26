import React, { useState } from "react";
import { useAuth } from "../lib/auth-context";
import { useTheme } from "../lib/theme-context";
import { School, Lock, User, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, Sun, Moon } from "lucide-react";

const DEMO_ACCOUNTS = [
  { role: "Super Admin", id: "admin@apexschool.com", pass: "Admin@123456" },
  { role: "Teacher", id: "teacher@apexschool.com", pass: "Teacher@123" },
  { role: "Accountant", id: "accountant@apexschool.com", pass: "Accountant@123" },
  { role: "Parent", id: "parent@apexschool.com", pass: "Parent@123" },
  { role: "Student", id: "student@apexschool.com", pass: "Student@123" },
];

export default function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(identifier, password);
    } catch (err) {
      setError(err.message || "Invalid credentials. Please verify and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (id, pass) => {
    setIdentifier(id);
    setPassword(pass);
    setError("");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-brand-50/30 to-indigo-50/50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Floating Theme Toggle */}
      <button
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 backdrop-blur text-slate-600 shadow-sm transition hover:bg-white active:scale-95 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5 text-amber-400" />
        ) : (
          <Moon className="h-5 w-5 text-slate-600" />
        )}
      </button>

      <div className="w-full max-w-md animate-fade-in">
        {/* Brand Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-brand-100/30 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-500/20">
              <School className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Apex International School
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Sign in with your email or mobile phone
            </p>
          </div>

          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-rose-50 p-3.5 text-xs text-rose-700 ring-1 ring-rose-200 animate-shake dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email or Mobile Number
              </label>
              <div className="relative mt-1.5">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@apexschool.com or 03001234567"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 transition dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800 dark:focus:ring-brand-900/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 transition dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800 dark:focus:ring-brand-900/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary mt-2 w-full justify-center py-3 text-sm shadow-sm hover:shadow"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating…
                </>
              ) : (
                "Sign In to Portal"
              )}
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2.5 dark:text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
              <span>Quick Demo Fill:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((demo) => (
                <button
                  key={demo.role}
                  type="button"
                  onClick={() => fillDemo(demo.id, demo.pass)}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-brand-600 dark:hover:bg-slate-800"
                >
                  <span className="block font-semibold">{demo.role}</span>
                  <span className="block truncate text-[10px] text-slate-400 dark:text-slate-400">{demo.id}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
          Protected by Apex Role-Based Access Control (RBAC) & AES-encrypted sessions
        </p>
      </div>
    </div>
  );
}


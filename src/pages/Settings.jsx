import React, { useState } from "react";
import { School, Bell, Shield, Globe, Palette, Database, Mail, Save } from "lucide-react";
import { SectionHeader } from "../components/ui";
import { useToast } from "../components/Toast";

export default function Settings() {
  const { push } = useToast();
  const [school, setSchool] = useState({
    name: "Apex International School",
    session: "2026–2027 · Term 1",
    email: "info@apex.edu",
    phone: "+92 42 111 222 333",
    address: "123 Education Ave, Gulberg, Lahore",
    currency: "PKR",
    language: "English",
  });

  const save = () => push("Settings saved successfully", "success");

  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" subtitle="Manage school profile and preferences" action={<button className="btn-primary" onClick={save}><Save className="h-4 w-4" /> Save Changes</button>} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-2">
          <SettingsNav />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <School className="h-5 w-5 text-brand-600" />
              <h3 className="font-semibold text-slate-900">School Profile</h3>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="School Name"><input className="input" value={school.name} onChange={(e) => setSchool({ ...school, name: e.target.value })} /></Field>
              <Field label="Academic Session"><input className="input" value={school.session} onChange={(e) => setSchool({ ...school, session: e.target.value })} /></Field>
              <Field label="Email"><input className="input" value={school.email} onChange={(e) => setSchool({ ...school, email: e.target.value })} /></Field>
              <Field label="Phone"><input className="input" value={school.phone} onChange={(e) => setSchool({ ...school, phone: e.target.value })} /></Field>
              <Field label="Address" full><input className="input" value={school.address} onChange={(e) => setSchool({ ...school, address: e.target.value })} /></Field>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <Palette className="h-5 w-5 text-brand-600" />
              <h3 className="font-semibold text-slate-900">Preferences</h3>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Currency"><select className="input" value={school.currency} onChange={(e) => setSchool({ ...school, currency: e.target.value })}><option>PKR</option><option>USD</option><option>EUR</option></select></Field>
              <Field label="Language"><select className="input" value={school.language} onChange={(e) => setSchool({ ...school, language: e.target.value })}><option>English</option><option>Urdu</option></select></Field>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <Shield className="h-5 w-5 text-brand-600" />
              <h3 className="font-semibold text-slate-900">Security</h3>
            </div>
            <div className="mt-5 space-y-3">
              <Toggle icon={Bell} label="Email notifications" desc="Receive alerts for new admissions & fees" defaultOn />
              <Toggle icon={Mail} label="Weekly reports" desc="Summary email every Monday" defaultOn />
              <Toggle icon={Globe} label="Two-factor authentication" desc="Extra layer of account security" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsNav() {
  const items = [
    { icon: School, label: "School Profile", active: true },
    { icon: Palette, label: "Preferences" },
    { icon: Shield, label: "Security" },
    { icon: Database, label: "Data & Backup" },
    { icon: Bell, label: "Notifications" },
  ];
  return (
    <div className="card p-2">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <button key={it.label} className={`nav-link w-full ${it.active ? "nav-link-active" : ""}`}>
            <Icon className={`h-4 w-4 ${it.active ? "text-brand-600" : "text-slate-400"}`} />
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ icon: Icon, label, desc, defaultOn }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Icon className="h-4 w-4" /></div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <p className="text-xs text-slate-500">{desc}</p>
        </div>
      </div>
      <button
        onClick={() => setOn(!on)}
        className={`relative h-6 w-11 rounded-full transition ${on ? "bg-brand-600" : "bg-slate-200"}`}
        aria-pressed={on}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

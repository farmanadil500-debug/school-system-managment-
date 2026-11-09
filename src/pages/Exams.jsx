import React, { useMemo, useState } from "react";
import { ClipboardList, Printer, GraduationCap, Award } from "lucide-react";
import { useToast } from "../components/Toast";
import { Avatar, SectionHeader } from "../components/ui";
import { CLASSES, EXAM_TERMS, SUBJECTS, getGradeFromPct, gradeColor } from "../data/mock";

const MAX_MARKS = 100;

export default function Exams({ students }) {
  const { push } = useToast();
  const [examTerm, setExamTerm] = useState(EXAM_TERMS[0]);
  const [classFilter, setClassFilter] = useState(CLASSES[4]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [scores, setScores] = useState({});

  const roster = useMemo(() => students.filter((s) => s.class === classFilter), [students, classFilter]);
  const selected = students.find((s) => s.id === selectedStudentId) || roster[0] || null;

  const currentScores = selected ? scores[selected.id] || {} : {};

  const setScore = (subject, value) => {
    if (!selected) return;
    const v = Math.max(0, Math.min(MAX_MARKS, Number(value) || 0));
    setScores((prev) => ({ ...prev, [selected.id]: { ...prev[selected.id], [subject]: v } }));
  };

  const filled = SUBJECTS.filter((s) => currentScores[s] !== undefined && currentScores[s] !== "");
  const total = filled.reduce((a, s) => a + Number(currentScores[s]), 0);
  const pct = filled.length === SUBJECTS.length ? Math.round((total / (SUBJECTS.length * MAX_MARKS)) * 100) : 0;
  const grade = filled.length === SUBJECTS.length ? getGradeFromPct(pct) : "—";

  const printReport = () => {
    if (filled.length !== SUBJECTS.length) {
      push("Enter all subject scores before printing the report card.", "warning");
      return;
    }
    push("Report card ready to print", "success");
    setTimeout(() => window.print(), 200);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Exams & Results"
        subtitle="Enter scores and generate printable report cards"
        action={<button className="btn-primary" onClick={printReport}><Printer className="h-4 w-4" /> Print Report Card</button>}
      />

      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Exam Term</label>
            <select value={examTerm} onChange={(e) => setExamTerm(e.target.value)} className="input">
              {EXAM_TERMS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Class</label>
            <select value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setSelectedStudentId(null); }} className="input">
              {CLASSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Student</label>
            <select value={selected?.id || ""} onChange={(e) => setSelectedStudentId(Number(e.target.value))} className="input">
              {roster.map((s) => <option key={s.id} value={s.id}>{s.name} · #{s.rollNo}</option>)}
            </select>
          </div>
        </div>
      </div>

      {selected && (
        <>
          <div className="card overflow-hidden no-print">
            <div className="flex items-center gap-4 border-b border-slate-100 p-5">
              <Avatar name={selected.name} size="lg" />
              <div>
                <p className="font-semibold text-slate-900">{selected.name}</p>
                <p className="text-sm text-slate-500">Roll #{selected.rollNo} · {selected.class} · {examTerm}</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead className="bg-slate-50/70">
                  <tr>
                    <th>Subject</th>
                    <th>Obtained Marks</th>
                    <th>Out Of</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {SUBJECTS.map((sub) => {
                    const v = currentScores[sub];
                    const pass = v !== undefined && Number(v) >= 40;
                    return (
                      <tr key={sub}>
                        <td className="font-medium text-slate-800">{sub}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max={MAX_MARKS}
                            value={v ?? ""}
                            onChange={(e) => setScore(sub, e.target.value)}
                            className="input w-28"
                            placeholder="0"
                          />
                        </td>
                        <td className="text-slate-500">{MAX_MARKS}</td>
                        <td>
                          {v === undefined ? (
                            <span className="badge bg-slate-100 text-slate-500">Pending</span>
                          ) : pass ? (
                            <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Pass</span>
                          ) : (
                            <span className="badge bg-rose-50 text-rose-700 ring-1 ring-rose-200">Fail</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-3 gap-px bg-slate-100">
              <div className="bg-white p-5 text-center">
                <p className="text-xs font-medium uppercase text-slate-400">Total Marks</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{total} / {SUBJECTS.length * MAX_MARKS}</p>
              </div>
              <div className="bg-white p-5 text-center">
                <p className="text-xs font-medium uppercase text-slate-400">Percentage</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{filled.length === SUBJECTS.length ? `${pct}%` : "—"}</p>
              </div>
              <div className="bg-white p-5 text-center">
                <p className="text-xs font-medium uppercase text-slate-400">Grade</p>
                <p className={`mt-1 text-xl font-bold ${gradeColor(grade)}`}>{grade}</p>
              </div>
            </div>
          </div>

          <div className="print-area mx-auto max-w-3xl">
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Apex International School</h2>
                      <p className="text-sm text-white/80">Official Student Report Card</p>
                    </div>
                  </div>
                  <Award className="h-8 w-8 text-white/70" />
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-4">
                  <Field label="Student" value={selected.name} />
                  <Field label="Roll No" value={`#${selected.rollNo}`} />
                  <Field label="Class" value={`${selected.class}`} />
                  <Field label="Exam Term" value={examTerm} />
                </div>
                <div className="mt-6 table-wrap">
                  <table className="table">
                    <thead className="bg-slate-50/70">
                      <tr>
                        <th>Subject</th>
                        <th>Obtained</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SUBJECTS.map((sub) => (
                        <tr key={sub}>
                          <td className="font-medium text-slate-800">{sub}</td>
                          <td className="font-semibold">{currentScores[sub] ?? "—"}</td>
                          <td className="text-slate-500">{MAX_MARKS}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200">
                        <td className="font-bold text-slate-900">Total</td>
                        <td className="font-bold text-slate-900">{total}</td>
                        <td className="font-bold text-slate-900">{SUBJECTS.length * MAX_MARKS}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="rounded-2xl bg-brand-50 p-4 text-center">
                    <p className="text-xs font-medium uppercase text-brand-700/70">Percentage</p>
                    <p className="mt-1 text-2xl font-bold text-brand-700">{filled.length === SUBJECTS.length ? `${pct}%` : "—"}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                    <p className="text-xs font-medium uppercase text-emerald-700/70">Grade</p>
                    <p className={`mt-1 text-2xl font-bold ${gradeColor(grade)}`}>{grade}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 p-4 text-center">
                    <p className="text-xs font-medium uppercase text-slate-500">Result</p>
                    <p className="mt-1 text-2xl font-bold text-slate-700">{filled.length === SUBJECTS.length ? (pct >= 50 ? "Pass" : "Fail") : "—"}</p>
                  </div>
                </div>
                <div className="mt-8 flex items-end justify-between text-sm text-slate-500">
                  <div>
                    <p>Class Teacher's Signature</p>
                    <div className="mt-6 w-40 border-b border-slate-300" />
                  </div>
                  <div className="text-right">
                    <p>Principal's Signature</p>
                    <div className="mt-6 ml-auto w-40 border-b border-slate-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import { Wallet, Search, Printer, DollarSign, Receipt, CheckCircle2 } from "lucide-react";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { Avatar, EmptyState, SectionHeader } from "../components/ui";
import { PAYMENT_METHODS, feeStatusStyle, formatPKR } from "../data/mock";
import { updateStudentAPI } from "../services/api";

export default function Fees({ students, setStudents, openCollect, onCloseCollect }) {
  const { push } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [receipt, setReceipt] = useState(null);

  const [collect, setCollect] = useState({ rollNo: "", method: "Cash", amount: "" });

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) => {
      const mq = !q || s.name.toLowerCase().includes(q) || s.rollNo.toString().includes(q);
      const ms = statusFilter === "All" || s.feeStatus === statusFilter;
      return mq && ms;
    });
  }, [students, search, statusFilter]);

  const totalExpected = students.reduce((a, s) => a + s.feeAmount, 0);
  const totalCollected = students.filter((s) => s.feeStatus === "Paid").reduce((a, s) => a + s.feeAmount, 0);
  const totalPending = students.filter((s) => s.feeStatus !== "Paid").reduce((a, s) => a + s.feeAmount, 0);

  const foundStudent = students.find((s) => s.rollNo.toString() === collect.rollNo.trim());

  const onOpenCollect = () => {
    setCollect({ rollNo: "", method: "Cash", amount: "" });
  };

  const confirmCollect = async () => {
    if (!foundStudent) {
      push("No student found with that roll number.", "warning");
      return;
    }
    const amt = Number(collect.amount || foundStudent.feeAmount);
    if (!amt || isNaN(amt)) {
      push("Enter a valid amount.", "warning");
      return;
    }

    const targetId = foundStudent.id || foundStudent._id;
    try {
      await updateStudentAPI(targetId, { feeStatus: "Paid" });
    } catch (err) {
      console.warn("Backend API offline or error, updating locally:", err.message);
    }

    setStudents((prev) =>
      prev.map((s) => ((s.id === targetId || s._id === targetId) ? { ...s, feeStatus: "Paid" } : s))
    );
    setReceipt({
      student: foundStudent,
      amount: amt,
      method: collect.method,
      date: new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }),
      receiptNo: "RCP-" + Math.floor(10000 + Math.random() * 90000),
    });
    push(`Fee of ${formatPKR(amt)} collected from ${foundStudent.name}`, "success");
    onCloseCollect();
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Fee Management"
        subtitle="Track collections, invoices, and pending dues"
        action={<button className="btn-primary" onClick={openCollect}><DollarSign className="h-4 w-4" /> Collect Fee</button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Total Expected" value={formatPKR(totalExpected)} accent="brand" icon={Wallet} />
        <SummaryCard label="Total Collected" value={formatPKR(totalCollected)} accent="emerald" icon={CheckCircle2} delta={`${Math.round((totalCollected / totalExpected) * 100)}% collected`} />
        <SummaryCard label="Total Pending" value={formatPKR(totalPending)} accent="amber" icon={Receipt} delta={`${students.filter((s) => s.feeStatus !== "Paid").length} students`} />
      </div>

      <div className="card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or roll no…" className="input pl-10" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
            <option>All</option>
            <option>Paid</option>
            <option>Pending</option>
            <option>Overdue</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={Wallet} title="No fee records" subtitle="No students match the current filter." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead className="bg-slate-50/70">
                <tr>
                  <th>Student</th>
                  <th>Roll No</th>
                  <th>Class</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} size="sm" />
                        <span className="font-medium text-slate-800">{s.name}</span>
                      </div>
                    </td>
                    <td><span className="font-mono text-slate-600">#{s.rollNo}</span></td>
                    <td><span className="badge bg-slate-100 text-slate-600">{s.class}</span></td>
                    <td className="font-semibold text-slate-800">{formatPKR(s.feeAmount)}</td>
                    <td><span className={`badge ${feeStatusStyle[s.feeStatus]}`}>{s.feeStatus}</span></td>
                    <td>
                      <div className="flex items-center justify-end">
                        {s.feeStatus === "Paid" ? (
                          <span className="text-xs font-medium text-emerald-600">Settled</span>
                        ) : (
                          <button
                            className="btn-secondary !py-1.5 !px-3 text-xs"
                            onClick={() => { setCollect({ rollNo: s.rollNo.toString(), method: "Cash", amount: s.feeAmount.toString() }); openCollect(); }}
                          >
                            <DollarSign className="h-3.5 w-3.5" /> Collect
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={openCollect}
        onClose={onCloseCollect}
        title="Collect Fee"
        subtitle="Search student by roll number to record a payment"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={onCloseCollect}>Cancel</button>
            <button className="btn-primary" onClick={confirmCollect}><DollarSign className="h-4 w-4" /> Confirm Payment</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Student Roll Number</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={collect.rollNo}
                onChange={(e) => setCollect({ ...collect, rollNo: e.target.value })}
                placeholder="e.g. 101"
                className="input pl-10"
              />
            </div>
          </div>

          {foundStudent ? (
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
              <Avatar name={foundStudent.name} />
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{foundStudent.name}</p>
                <p className="text-xs text-slate-500">{foundStudent.class} · Section {foundStudent.section}</p>
              </div>
              <span className={`badge ${feeStatusStyle[foundStudent.feeStatus]}`}>{foundStudent.feeStatus}</span>
            </div>
          ) : collect.rollNo ? (
            <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-600 ring-1 ring-rose-200">No student found with that roll number.</p>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount (PKR)</label>
              <input
                value={collect.amount}
                onChange={(e) => setCollect({ ...collect, amount: e.target.value })}
                placeholder={foundStudent ? foundStudent.feeAmount.toString() : "0"}
                className="input"
                type="number"
              />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select value={collect.method} onChange={(e) => setCollect({ ...collect, method: e.target.value })} className="input">
                {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {receipt && (
            <button className="btn-secondary w-full" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print Last Receipt
            </button>
          )}
        </div>
      </Modal>

      {receipt && (
        <div className="print-area mx-auto max-w-2xl">
          <div className="card p-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Apex International School</h2>
                <p className="text-sm text-slate-500">123 Education Ave, Gulberg, Lahore</p>
              </div>
              <Receipt className="h-8 w-8 text-brand-600" />
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">Receipt #: {receipt.receiptNo}</span>
              <span className="text-slate-500">{receipt.date}</span>
            </div>
            <div className="mt-6 space-y-2 text-sm">
              <Row label="Student" value={receipt.student.name} />
              <Row label="Roll No" value={`#${receipt.student.rollNo}`} />
              <Row label="Class" value={`${receipt.student.class} · Section ${receipt.student.section}`} />
              <Row label="Payment Method" value={receipt.method} />
            </div>
            <div className="mt-6 flex items-center justify-between rounded-2xl bg-brand-50 p-4">
              <span className="font-semibold text-brand-700">Amount Paid</span>
              <span className="text-2xl font-bold text-brand-700">{formatPKR(receipt.amount)}</span>
            </div>
            <p className="mt-6 text-center text-xs text-slate-400">This is a computer-generated receipt. Thank you for your payment.</p>
          </div>
          <div className="mt-4 flex justify-center no-print">
            <button className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print Receipt</button>
            <button className="btn-secondary ml-3" onClick={() => setReceipt(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent, icon: Icon, delta }) {
  const accents = {
    brand: "from-brand-500 to-brand-700",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${accents[accent]} text-white`}>
          <Icon className="h-5 w-5" />
        </div>
        {delta && <span className="text-xs font-medium text-slate-500">{delta}</span>}
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

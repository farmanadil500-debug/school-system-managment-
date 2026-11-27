import React, { useMemo, useState, useEffect } from "react";
import {
  Wallet,
  Search,
  Printer,
  DollarSign,
  Receipt,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Plus,
  RefreshCw,
  Loader2,
  Phone,
  FileText,
  RotateCcw,
  Check,
  Eye,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { Avatar, EmptyState, SectionHeader } from "../components/ui";
import { PAYMENT_METHODS, feeStatusStyle, formatPKR } from "../data/mock";
import { apiFetch } from "../lib/api-client";
import {
  fetchVouchersAPI,
  generateVouchersAPI,
  getVoucherByIdAPI,
  recordPaymentAPI,
  reversePaymentAPI,
  fetchDefaultersAPI,
  fetchFeeStructuresAPI,
  saveFeeStructureAPI,
} from "../lib/fees-api";
import { useAuth } from "../lib/auth-context";
import { can, ROLES } from "../lib/permissions";

const STATUS_BADGES = {
  paid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  partial: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  unpaid: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  cancelled: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
};

export default function Fees({ students = [], setStudents, openCollect, onCloseCollect }) {
  const { push } = useToast();
  const { user } = useAuth();
  const canManage =
    user?.role === ROLES.SUPER_ADMIN ||
    user?.role === ROLES.ADMIN ||
    user?.role === ROLES.ACCOUNTANT;

  const currentPeriod = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());

  // Active Tab: "vouchers" | "defaulters" | "structures"
  const [activeTab, setActiveTab] = useState("vouchers");

  // Vouchers List State
  const [vouchers, setVouchers] = useState([]);
  const [summary, setSummary] = useState({ totalExpected: 0, totalCollected: 0, totalPending: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState(currentPeriod);
  const [statusFilter, setStatusFilter] = useState("All");
  const [classFilter, setClassFilter] = useState("All");

  // Classes from Academic API
  const [classesList, setClassesList] = useState([]);

  // Modals
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState(null);
  const [voucherDetailsTarget, setVoucherDetailsTarget] = useState(null);
  const [reversalTarget, setReversalTarget] = useState(null);
  const [reversalReason, setReversalReason] = useState("");

  // Collect Payment Form State
  const [selectedVoucherForPayment, setSelectedVoucherForPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "cash",
    reference: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate Vouchers Form State
  const [generateForm, setGenerateForm] = useState({
    period: currentPeriod,
    classId: "All",
    dueDate: "",
  });

  // Defaulters List State
  const [defaulters, setDefaulters] = useState([]);
  const [defaultersLoading, setDefaultersLoading] = useState(false);

  // Fee Structures State
  const [structures, setStructures] = useState([]);
  const [structuresLoading, setStructuresLoading] = useState(false);

  // 1. Fetch Academic Classes
  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await apiFetch("/api/v1/academic/classes");
        if (res?.data) setClassesList(res.data);
      } catch (_e) {
        // Fallback
      }
    }
    loadMeta();
  }, []);

  // 2. Load Vouchers from API
  const loadVouchers = async () => {
    setIsLoading(true);
    try {
      const res = await fetchVouchersAPI({
        period: periodFilter !== "All" ? periodFilter : undefined,
        status: statusFilter !== "All" ? statusFilter : undefined,
        classId: classFilter !== "All" ? classFilter : undefined,
        q: search || undefined,
        limit: 100,
      });

      if (res?.data && res.data.length > 0) {
        setVouchers(res.data);
        if (res.summary) setSummary(res.summary);
      } else {
        setVouchers(res?.data || []);
        if (res?.summary) {
          setSummary(res.summary);
        } else {
          setSummary({ totalExpected: 0, totalCollected: 0, totalPending: 0 });
        }
      }
    } catch (_err) {
      setVouchers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "vouchers") {
      loadVouchers();
    }
  }, [periodFilter, statusFilter, classFilter, search, activeTab]);

  // 3. Load Defaulters
  const loadDefaulters = async () => {
    setDefaultersLoading(true);
    try {
      const res = await fetchDefaultersAPI();
      if (res?.data) {
        setDefaulters(res.data);
      } else {
        setDefaulters([]);
      }
    } catch (_e) {
      setDefaulters([]);
    } finally {
      setDefaultersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "defaulters") {
      loadDefaulters();
    }
  }, [activeTab]);

  // 4. Load Fee Structures
  const loadStructures = async () => {
    setStructuresLoading(true);
    try {
      const res = await fetchFeeStructuresAPI();
      if (res?.data) {
        setStructures(res.data);
      } else {
        setStructures([]);
      }
    } catch (_e) {
      setStructures([]);
    } finally {
      setStructuresLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "structures") {
      loadStructures();
    }
  }, [activeTab]);

  // Handle Open Collect Modal
  const handleOpenCollect = (voucher = null) => {
    if (voucher) {
      setSelectedVoucherForPayment(voucher);
      setPaymentForm({
        amount: voucher.balance,
        method: "cash",
        reference: "",
        notes: "",
      });
    } else {
      setSelectedVoucherForPayment(null);
      setPaymentForm({
        amount: "",
        method: "cash",
        reference: "",
        notes: "",
      });
    }
    setCollectModalOpen(true);
  };

  // Submit Collect Payment
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!selectedVoucherForPayment) {
      push("Select a student voucher to collect payment.", "warning");
      return;
    }

    const amt = Number(paymentForm.amount);
    if (!amt || amt <= 0) {
      push("Enter a valid payment amount.", "warning");
      return;
    }
    if (amt > selectedVoucherForPayment.balance) {
      push(`Amount exceeds balance of PKR ${selectedVoucherForPayment.balance}`, "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordPaymentAPI(selectedVoucherForPayment._id, {
        amount: amt,
        method: paymentForm.method,
        reference: paymentForm.reference,
        notes: paymentForm.notes,
      });

      push(`Payment of PKR ${amt.toLocaleString()} recorded!`, "success");
      setCollectModalOpen(false);

      // Open Printable Receipt
      const paymentData = res?.data?.payment;
      setReceiptTarget({
        receiptNo: paymentData?.receiptNo || "REC-" + Date.now().toString().slice(-4),
        date: new Date().toLocaleDateString("en-PK", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        studentName: selectedVoucherForPayment.studentId?.name,
        admissionNo: selectedVoucherForPayment.studentId?.admissionNo,
        rollNo: selectedVoucherForPayment.studentId?.rollNo,
        className:
          selectedVoucherForPayment.enrollmentId?.classId?.name || "Class",
        sectionName:
          selectedVoucherForPayment.enrollmentId?.sectionId?.name || "A",
        amount: amt,
        method: paymentForm.method,
        remainingBalance: Math.max(0, selectedVoucherForPayment.balance - amt),
        period: selectedVoucherForPayment.period,
      });

      await loadVouchers();
    } catch (err) {
      push(err.message || "Failed to record payment.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Generate Monthly Vouchers
  const handleGenerateVouchers = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await generateVouchersAPI({
        period: generateForm.period,
        classId: generateForm.classId !== "All" ? generateForm.classId : undefined,
        dueDate: generateForm.dueDate || undefined,
      });

      const data = res?.data;
      push(
        `Generated ${data?.generatedCount || 0} vouchers (Skipped ${data?.skippedCount || 0} existing).`,
        "success"
      );
      setGenerateModalOpen(false);
      setPeriodFilter(generateForm.period);
      await loadVouchers();
    } catch (err) {
      push(err.message || "Failed to generate vouchers.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // View Voucher Details
  const handleViewVoucher = async (vch) => {
    try {
      const res = await getVoucherByIdAPI(vch._id);
      if (res?.data) {
        setVoucherDetailsTarget(res.data);
      } else {
        setVoucherDetailsTarget(vch);
      }
    } catch (_e) {
      setVoucherDetailsTarget(vch);
    }
  };

  // Submit Reversal
  const handleConfirmReversal = async () => {
    if (!reversalTarget || !reversalReason.trim()) {
      push("Please provide a reason for the reversal.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      await reversePaymentAPI(reversalTarget._id, { reason: reversalReason });
      push(`Payment receipt ${reversalTarget.receiptNo} reversed.`, "success");
      setReversalTarget(null);
      setReversalReason("");
      setVoucherDetailsTarget(null);
      await loadVouchers();
    } catch (err) {
      push(err.message || "Failed to reverse payment.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <SectionHeader
        title="Fee Management & Billing"
        subtitle="Student fee vouchers, payment collection, receipts, and revenue tracking"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab("vouchers")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "vouchers"
                    ? "bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>Fee Vouchers</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("defaulters")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "defaulters"
                    ? "bg-white text-rose-700 shadow-sm dark:bg-slate-900 dark:text-rose-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                <span>Overdue Defaulters</span>
              </button>
            </div>

            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => setGenerateModalOpen(true)}
                  className="btn-secondary"
                >
                  <Plus className="h-4 w-4" />
                  <span>Generate Vouchers</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenCollect(null)}
                  className="btn-primary"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Collect Payment</span>
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Invoiced
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            PKR {summary.totalExpected.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Billing for period {periodFilter}
          </p>
        </div>

        <div className="card border-emerald-100 bg-emerald-50/20 p-5 dark:border-emerald-800/60 dark:bg-emerald-950/40">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Total Collected
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            PKR {summary.totalCollected.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-emerald-600 font-semibold dark:text-emerald-400">
            {summary.totalExpected > 0
              ? `${Math.round(
                  (summary.totalCollected / summary.totalExpected) * 100
                )}% recovery rate`
              : "0% recovery"}
          </p>
        </div>

        <div className="card border-rose-100 bg-rose-50/20 p-5 dark:border-rose-800/60 dark:bg-rose-950/40">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              Outstanding Dues
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            PKR {summary.totalPending.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-rose-600 font-semibold">
            Pending student fees
          </p>
        </div>
      </div>

      {/* ================= TAB 1: VOUCHERS LIST ================= */}
      {activeTab === "vouchers" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search student name, voucher #, or admission #…"
                  className="input pl-10"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="month"
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  className="input w-auto text-xs font-semibold"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input w-auto text-xs"
                >
                  <option value="All">All Statuses</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="input w-auto text-xs"
                >
                  <option value="All">All Classes</option>
                  {classesList.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={loadVouchers}
                  className="btn-ghost p-2 text-slate-400 hover:text-slate-700"
                  title="Reload Vouchers"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Vouchers Table */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
              <p className="mt-3 text-sm text-slate-500">
                Loading fee records…
              </p>
            </div>
          ) : vouchers.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={Receipt}
                title="No fee vouchers found"
                subtitle="Try selecting a different billing month or generate new vouchers for this period."
                action={
                  canManage && (
                    <button
                      type="button"
                      onClick={() => setGenerateModalOpen(true)}
                      className="btn-primary"
                    >
                      Generate Vouchers for {periodFilter}
                    </button>
                  )
                }
              />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="table-wrap">
                <table className="table">
                  <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Voucher #</th>
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-5 py-3.5">Class / Sec</th>
                      <th className="px-5 py-3.5 text-right">Total</th>
                      <th className="px-5 py-3.5 text-right">Paid</th>
                      <th className="px-5 py-3.5 text-right">Balance</th>
                      <th className="px-5 py-3.5 text-center">Due Date</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vouchers.map((vch) => {
                      const studentName = vch.studentId?.name || "Student";
                      const className =
                        vch.enrollmentId?.classId?.name || "Class";
                      const sectionName =
                        vch.enrollmentId?.sectionId?.name || "A";

                      return (
                        <tr
                          key={vch._id}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="px-5 py-4 font-mono text-xs font-bold text-slate-700">
                            {vch.voucherNo}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={studentName} size="sm" />
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {studentName}
                                </p>
                                <p className="text-xs font-mono text-slate-400">
                                  {vch.studentId?.admissionNo ||
                                    `Roll ${vch.studentId?.rollNo}`}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs font-medium text-slate-600">
                            {className} · {sectionName}
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-xs font-semibold text-slate-900">
                            PKR {vch.total.toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-xs font-semibold text-emerald-600">
                            PKR {vch.paidAmount.toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-xs font-bold text-rose-600">
                            PKR {vch.balance.toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-center text-xs text-slate-500">
                            {vch.dueDate}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span
                              className={`badge capitalize ${
                                STATUS_BADGES[vch.status] || STATUS_BADGES.unpaid
                              }`}
                            >
                              {vch.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleViewVoucher(vch)}
                                className="btn-ghost p-1.5 text-slate-500 hover:text-slate-900"
                                title="View details & receipt history"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {canManage && vch.balance > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenCollect(vch)}
                                  className="btn-primary py-1 px-2.5 text-xs"
                                >
                                  Collect
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: DEFAULTERS LIST ================= */}
      {activeTab === "defaulters" && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">
                  Overdue Defaulters Report
                </h3>
                <p className="text-xs text-slate-500">
                  Students with unpaid balances past the monthly due date
                </p>
              </div>
              <button
                type="button"
                onClick={loadDefaulters}
                className="btn-secondary text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh Report
              </button>
            </div>
          </div>

          {defaultersLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
              <p className="mt-3 text-sm text-slate-500">Scanning overdue dues…</p>
            </div>
          ) : defaulters.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={CheckCircle2}
                title="No overdue fee defaulters"
                subtitle="All students are up to date with their tuition payments."
              />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="table-wrap">
                <table className="table">
                  <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-5 py-3.5">Class</th>
                      <th className="px-5 py-3.5">Guardian Contact</th>
                      <th className="px-5 py-3.5 text-center">Due Date</th>
                      <th className="px-5 py-3.5 text-center">Days Overdue</th>
                      <th className="px-5 py-3.5 text-right">Overdue Balance</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {defaulters.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">
                            {d.studentName}
                          </p>
                          <p className="text-xs font-mono text-slate-400">
                            {d.admissionNo} · {d.voucherNo}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-700">
                          {d.className} - {d.sectionName}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-xs font-semibold text-slate-800">
                            {d.guardianName || "Parent"}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-slate-500">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{d.guardianPhone || "—"}</span>
                          </p>
                        </td>
                        <td className="px-5 py-4 text-center text-xs text-slate-500">
                          {d.dueDate}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="badge bg-rose-50 text-rose-700 ring-1 ring-rose-200 font-bold">
                            {d.daysOverdue} days late
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-mono text-sm font-bold text-rose-700">
                          PKR {d.balance.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenCollect({
                                _id: d.voucherId,
                                voucherNo: d.voucherNo,
                                total: d.total,
                                paidAmount: d.paidAmount,
                                balance: d.balance,
                                studentId: { name: d.studentName, admissionNo: d.admissionNo },
                                enrollmentId: { classId: { name: d.className }, sectionId: { name: d.sectionName } },
                                period: d.period,
                              })
                            }
                            className="btn-primary py-1 px-3 text-xs"
                          >
                            Collect Dues
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: COLLECT FEE PAYMENT ================= */}
      <Modal
        open={collectModalOpen}
        onClose={() => setCollectModalOpen(false)}
        title="Collect Fee Payment"
        subtitle={
          selectedVoucherForPayment
            ? `Voucher ${selectedVoucherForPayment.voucherNo} for ${selectedVoucherForPayment.studentId?.name}`
            : "Record cash, bank transfer, or online payment"
        }
        size="md"
      >
        <form onSubmit={handleSubmitPayment} className="space-y-4">
          {/* If opened without a pre-selected voucher, show selector */}
          {!selectedVoucherForPayment ? (
            <div>
              <label className="label">Select Student Voucher *</label>
              <select
                required
                onChange={(e) => {
                  const v = vouchers.find((vch) => vch._id === e.target.value);
                  setSelectedVoucherForPayment(v);
                  if (v) {
                    setPaymentForm({ ...paymentForm, amount: v.balance });
                  }
                }}
                className="input text-sm"
              >
                <option value="">-- Choose Voucher --</option>
                {vouchers
                  .filter((v) => v.balance > 0)
                  .map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.studentId?.name} ({v.voucherNo}) · Outstanding: PKR{" "}
                      {v.balance.toLocaleString()}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">
                    {selectedVoucherForPayment.studentId?.name}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedVoucherForPayment.voucherNo} · Period{" "}
                    {selectedVoucherForPayment.period}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-semibold uppercase">
                    Outstanding
                  </p>
                  <p className="text-lg font-black text-rose-700">
                    PKR {selectedVoucherForPayment.balance.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Amount to Collect (PKR) *</label>
              <input
                required
                type="number"
                min="1"
                max={selectedVoucherForPayment?.balance || 999999}
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, amount: e.target.value })
                }
                placeholder="e.g. 5000"
                className="input font-mono font-bold"
              />
              {selectedVoucherForPayment && (
                <span className="text-[11px] text-slate-500">
                  Max: PKR {selectedVoucherForPayment.balance.toLocaleString()}
                </span>
              )}
            </div>

            <div>
              <label className="label">Payment Method *</label>
              <select
                value={paymentForm.method}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, method: e.target.value })
                }
                className="input capitalize"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online Payment</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="label">Bank Reference / Slip ID</label>
              <input
                value={paymentForm.reference}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, reference: e.target.value })
                }
                placeholder="e.g. HBL-1294829 or Cash Slip #22"
                className="input"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Cashier Notes</label>
              <input
                value={paymentForm.notes}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, notes: e.target.value })
                }
                placeholder="Optional notes or remarks…"
                className="input"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setCollectModalOpen(false)}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !selectedVoucherForPayment}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Recording…</span>
                </>
              ) : (
                <span>Confirm & Print Receipt</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: PRINTABLE RECEIPT ================= */}
      <Modal
        open={!!receiptTarget}
        onClose={() => setReceiptTarget(null)}
        title="Official Fee Payment Receipt"
        subtitle={`Receipt ${receiptTarget?.receiptNo}`}
        size="md"
      >
        {receiptTarget && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm font-sans" id="printable-receipt">
              {/* Receipt Header */}
              <div className="border-b border-slate-200 pb-4 text-center">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  APEX INTERNATIONAL SCHOOL
                </h2>
                <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">
                  Official Fee Collection Receipt
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-600 font-mono">
                  <span>Receipt #: <strong>{receiptTarget.receiptNo}</strong></span>
                  <span>Date: <strong>{receiptTarget.date}</strong></span>
                </div>
              </div>

              {/* Student Details */}
              <div className="grid grid-cols-2 gap-3 py-4 text-xs border-b border-slate-100">
                <div>
                  <span className="text-slate-400">Student Name:</span>
                  <p className="font-bold text-slate-900 text-sm">
                    {receiptTarget.studentName}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Admission / Roll #:</span>
                  <p className="font-bold text-slate-900">
                    {receiptTarget.admissionNo} (Roll: {receiptTarget.rollNo || "—"})
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Class & Section:</span>
                  <p className="font-semibold text-slate-800">
                    {receiptTarget.className} - {receiptTarget.sectionName}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Billing Period:</span>
                  <p className="font-semibold text-slate-800">
                    {receiptTarget.period}
                  </p>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="py-4 space-y-2 border-b border-slate-100 text-xs">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Payment Method:</span>
                  <span className="capitalize">{receiptTarget.method?.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-emerald-700 pt-1">
                  <span>Amount Paid:</span>
                  <span className="font-mono text-base">
                    PKR {receiptTarget.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 font-semibold pt-1">
                  <span>Remaining Outstanding Balance:</span>
                  <span className="font-mono text-rose-600 font-bold">
                    PKR {receiptTarget.remainingBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-8 flex items-end justify-between text-[11px] text-slate-400 pt-4">
                <div className="text-center">
                  <div className="w-24 border-b border-slate-300 mb-1"></div>
                  <span>Student / Guardian</span>
                </div>
                <div className="text-center">
                  <div className="w-24 border-b border-slate-300 mb-1"></div>
                  <span>Accounts Officer Stamp</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReceiptTarget(null)}
                className="btn-secondary"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-primary"
              >
                <Printer className="h-4 w-4" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL: GENERATE VOUCHERS ================= */}
      <Modal
        open={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title="Generate Monthly Fee Vouchers"
        subtitle="Idempotent batch voucher creation for active students"
        size="md"
      >
        <form onSubmit={handleGenerateVouchers} className="space-y-4">
          <div>
            <label className="label">Billing Month (Period) *</label>
            <input
              required
              type="month"
              value={generateForm.period}
              onChange={(e) =>
                setGenerateForm({ ...generateForm, period: e.target.value })
              }
              className="input font-semibold"
            />
          </div>

          <div>
            <label className="label">Target Class</label>
            <select
              value={generateForm.classId}
              onChange={(e) =>
                setGenerateForm({ ...generateForm, classId: e.target.value })
              }
              className="input"
            >
              <option value="All">All Classes & Grades</option>
              {classesList.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Due Date (Optional)</label>
            <input
              type="date"
              value={generateForm.dueDate}
              onChange={(e) =>
                setGenerateForm({ ...generateForm, dueDate: e.target.value })
              }
              className="input"
            />
            <span className="text-[11px] text-slate-400">
              Leave blank to automatically use the 10th of the month.
            </span>
          </div>

          <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-700 ring-1 ring-blue-200">
            <strong>Idempotent Safe:</strong> If a voucher already exists for any
            student for this month, it will not be duplicated.
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setGenerateModalOpen(false)}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating…</span>
                </>
              ) : (
                <span>Generate Vouchers</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: VOUCHER DETAILS & PAYMENT HISTORY ================= */}
      <Modal
        open={!!voucherDetailsTarget}
        onClose={() => setVoucherDetailsTarget(null)}
        title="Voucher Details & Receipts"
        subtitle={`Voucher ${voucherDetailsTarget?.voucherNo}`}
        size="lg"
      >
        {voucherDetailsTarget && (
          <div className="space-y-5">
            {/* Summary Banner */}
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900 text-base">
                  {voucherDetailsTarget.studentId?.name}
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  {voucherDetailsTarget.studentId?.admissionNo} ·{" "}
                  {voucherDetailsTarget.enrollmentId?.classId?.name} -{" "}
                  {voucherDetailsTarget.enrollmentId?.sectionId?.name}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">
                    Total: PKR {voucherDetailsTarget.total?.toLocaleString()}
                  </p>
                  <p className="text-xs font-semibold text-emerald-600">
                    Paid: PKR {voucherDetailsTarget.paidAmount?.toLocaleString()}
                  </p>
                  <p className="text-sm font-black text-rose-600">
                    Balance: PKR {voucherDetailsTarget.balance?.toLocaleString()}
                  </p>
                </div>
                <span
                  className={`badge capitalize ${
                    STATUS_BADGES[voucherDetailsTarget.status] || STATUS_BADGES.unpaid
                  }`}
                >
                  {voucherDetailsTarget.status}
                </span>
              </div>
            </div>

            {/* Fee Items List */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Fee Items Breakdown
              </p>
              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                {(voucherDetailsTarget.items || []).map((item, i) => (
                  <div key={i} className="flex justify-between p-3">
                    <span className="font-medium text-slate-700">{item.name}</span>
                    <span className="font-mono font-bold text-slate-900">
                      PKR {item.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Receipts History */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Payment History (Receipts)
              </p>
              {(!voucherDetailsTarget.payments || voucherDetailsTarget.payments.length === 0) ? (
                <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">
                  No payments recorded yet for this voucher.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                  <table className="table">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2">Receipt #</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Method</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2 text-center">Status</th>
                        {canManage && <th className="px-3 py-2 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {voucherDetailsTarget.payments.map((p) => (
                        <tr key={p._id}>
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-700">
                            {p.receiptNo}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500">
                            {new Date(p.receivedAt).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2.5 capitalize">{p.method?.replace("_", " ")}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600">
                            PKR {p.amount.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`badge ${
                                p.status === "posted"
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                  : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          {canManage && (
                            <td className="px-3 py-2.5 text-right">
                              {p.status === "posted" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReversalTarget(p);
                                    setReversalReason("");
                                  }}
                                  className="btn-ghost p-1 text-rose-500 hover:text-rose-700"
                                  title="Reverse payment"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVoucherDetailsTarget(null)}
                className="btn-secondary"
              >
                Close
              </button>
              {canManage && voucherDetailsTarget.balance > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    handleOpenCollect(voucherDetailsTarget);
                    setVoucherDetailsTarget(null);
                  }}
                  className="btn-primary"
                >
                  Collect Payment
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL: CONFIRM REVERSAL ================= */}
      <Modal
        open={!!reversalTarget}
        onClose={() => setReversalTarget(null)}
        title="Reverse Payment Receipt"
        subtitle={`Receipt ${reversalTarget?.receiptNo}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 ring-1 ring-rose-200 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>
              This will reverse <strong>PKR {reversalTarget?.amount?.toLocaleString()}</strong> and restore the outstanding balance on the fee voucher. An audit log entry will be created.
            </span>
          </div>

          <div>
            <label className="label">Reason for Reversal *</label>
            <input
              required
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              placeholder="e.g. Cheque bounced, wrong amount entered"
              className="input text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setReversalTarget(null)}
              className="btn-secondary text-xs"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReversal}
              className="btn bg-rose-600 text-white hover:bg-rose-700 text-xs"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Reversing…" : "Confirm Reversal"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

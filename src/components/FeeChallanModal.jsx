import React, { useState } from "react";
import {
  Printer,
  X,
  School,
  CheckCircle2,
  Calendar,
  CreditCard,
  AlertCircle,
  FileText,
  Building2,
  Scissors,
} from "lucide-react";

/**
 * Format currency in Pakistani Rupees
 */
function formatPKR(num) {
  if (num == null || isNaN(num)) return "0";
  return Number(num).toLocaleString("en-PK");
}

/**
 * Single Challan Slip (Bank Copy, School Copy, or Student Copy)
 */
function ChallanSlip({
  type = "BANK COPY",
  badgeColor = "bg-blue-600 text-white",
  challan,
  formattedDueDate,
  formattedIssueDate,
  monthName,
  breakdownItems,
  lateFee,
  totalAfterDue,
}) {
  const isPaid = challan.status === "paid";
  const isPartial = challan.status === "partial";

  return (
    <div className="flex flex-col justify-between border-2 border-slate-800 bg-white p-3 text-[11px] leading-tight text-slate-900 shadow-sm rounded-lg print:rounded-none print:shadow-none print:border-slate-800 break-inside-avoid">
      <div>
        {/* Header with School Details */}
        <div className="border-b-2 border-slate-800 pb-2 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <School className="h-4 w-4 text-slate-800 shrink-0" />
            <h2 className="font-black text-xs tracking-tight uppercase">
              Apex International School
            </h2>
          </div>
          <p className="text-[9px] text-slate-600">
            Main Campus, Gulberg III, Lahore · Ph: +92 42 3578 9000
          </p>
          <div className="mt-1 flex items-center justify-center gap-1 text-[9px] font-semibold text-slate-700 bg-slate-100 py-0.5 px-2 rounded">
            <Building2 className="h-3 w-3" />
            <span>Meezan Bank Ltd · A/C: 0102-0100456789</span>
          </div>

          {/* Copy Badge */}
          <div className="mt-1.5 flex justify-center">
            <span
              className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded ${badgeColor} print:bg-slate-800 print:text-white`}
            >
              [ {type} ]
            </span>
          </div>
        </div>

        {/* Challan Meta & Date Box */}
        <div className="grid grid-cols-2 gap-1 py-1.5 border-b border-slate-300 text-[10px] bg-slate-50 px-1.5 mt-1 font-mono">
          <div>
            <span className="text-slate-500 block text-[9px]">Challan #:</span>
            <span className="font-bold text-slate-900">{challan.voucherNo}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block text-[9px]">Billing Month:</span>
            <span className="font-bold text-slate-900">{monthName}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px]">Issue Date:</span>
            <span>{formattedIssueDate}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block text-[9px]">Due Date:</span>
            <span className="font-bold text-rose-600">{formattedDueDate}</span>
          </div>
        </div>

        {/* Student Details Box */}
        <div className="py-2 border-b border-slate-300 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Student Name:</span>
            <span className="font-bold text-slate-900">{challan.studentName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Father/Guardian:</span>
            <span className="font-semibold text-slate-800">
              {challan.guardianName || "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Admission / Roll:</span>
            <span className="font-mono font-bold text-slate-900">
              {challan.admissionNo} {challan.rollNo ? `(Roll: ${challan.rollNo})` : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Class & Section:</span>
            <span className="font-semibold text-slate-800">
              {challan.className} {challan.sectionName ? `· ${challan.sectionName}` : ""}
            </span>
          </div>
        </div>

        {/* Particulars Table */}
        <div className="py-2 border-b border-slate-300">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-400 font-bold text-slate-700">
                <th className="text-left pb-1">Particulars</th>
                <th className="text-right pb-1">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {breakdownItems.map((item, idx) => (
                <tr key={idx} className="py-0.5">
                  <td className="py-0.5 text-slate-700">{item.name}</td>
                  <td className="py-0.5 text-right font-mono font-medium">
                    {formatPKR(item.amount)}
                  </td>
                </tr>
              ))}
              {challan.fine > 0 && (
                <tr className="text-rose-600">
                  <td className="py-0.5">Fine / Arrears</td>
                  <td className="py-0.5 text-right font-mono font-medium">
                    {formatPKR(challan.fine)}
                  </td>
                </tr>
              )}
              {challan.discount > 0 && (
                <tr className="text-emerald-700">
                  <td className="py-0.5">Fee Concession / Discount</td>
                  <td className="py-0.5 text-right font-mono font-medium">
                    -{formatPKR(challan.discount)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals Summary */}
          <div className="mt-2 space-y-1 pt-1.5 border-t-2 border-slate-800 font-mono text-[10px]">
            <div className="flex justify-between font-bold text-slate-900 text-[11px]">
              <span>Payable within Due Date:</span>
              <span className="font-black text-slate-900">
                PKR {formatPKR(challan.total)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 text-[9px]">
              <span>Late Fee Surcharge:</span>
              <span>PKR {formatPKR(lateFee)}</span>
            </div>
            <div className="flex justify-between font-bold text-rose-700 text-[10px] bg-rose-50 p-1 rounded print:bg-slate-100 print:text-slate-900">
              <span>Payable after Due Date:</span>
              <span>PKR {formatPKR(totalAfterDue)}</span>
            </div>
          </div>
        </div>

        {/* Payment Status Notice */}
        <div className="my-2 p-1.5 rounded text-center font-bold text-[10px]">
          {isPaid ? (
            <div className="border border-emerald-500 bg-emerald-50 text-emerald-800 p-1 rounded">
              ✓ FEE PAID · PKR {formatPKR(challan.paidAmount)}
              {challan.paidAt && (
                <span className="block text-[8px] font-normal font-mono text-emerald-700">
                  Paid on {challan.paidAt} ({challan.paymentMethod || "Cash"})
                </span>
              )}
            </div>
          ) : isPartial ? (
            <div className="border border-amber-500 bg-amber-50 text-amber-800 p-1 rounded">
              PARTIALLY PAID · Balance: PKR {formatPKR(challan.balance)}
            </div>
          ) : (
            <div className="border border-rose-400 bg-rose-50 text-rose-800 p-1 rounded">
              UNPAID · PLEASE PAY BY {formattedDueDate}
            </div>
          )}
        </div>

        {/* Terms */}
        <div className="text-[8px] text-slate-500 space-y-0.5 pt-1">
          <p>• Payments accepted at Meezan Bank branch counters & 1Link ATM/App.</p>
          <p>• Fee once deposited is strictly non-refundable / non-transferable.</p>
          <p>• Bank charges PKR 20 applicable per deposit voucher.</p>
        </div>
      </div>

      {/* Dual Signature Fields */}
      <div className="mt-6 pt-3 border-t border-slate-300 flex justify-between text-[9px] text-slate-600 font-sans">
        <div className="text-center">
          <div className="w-20 border-b border-slate-400 mb-1"></div>
          <span>Depositor Sign</span>
        </div>
        <div className="text-center">
          <div className="w-24 border-b border-slate-400 mb-1"></div>
          <span>Cashier / Officer Stamp</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 3-Copy Fee Challan Modal
 */
export default function FeeChallanModal({ open, onClose, challan }) {
  const [viewMode, setViewMode] = useState("3copy"); // "3copy" | "single"

  if (!open || !challan) return null;

  // Format Dates
  const formattedDueDate = challan.dueDate || "15th of Month";
  const formattedIssueDate =
    challan.issueDate ||
    (challan.createdAt ? new Date(challan.createdAt).toISOString().split("T")[0] : "01st of Month");

  // Determine Month Name from Period (e.g., "2026-11" -> "November 2026")
  let monthName = challan.period || "Current Month";
  if (challan.period && challan.period.includes("-")) {
    const [year, month] = challan.period.split("-");
    const d = new Date(Number(year), Number(month) - 1, 1);
    if (!isNaN(d.getTime())) {
      monthName = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
  }

  // Fee Breakdown Items
  const breakdownItems =
    Array.isArray(challan.items) && challan.items.length > 0
      ? challan.items
      : [
          { name: "Monthly Tuition Fee", amount: (challan.total || 4500) - 500 },
          { name: "Exam & Utility Charges", amount: 300 },
          { name: "Computer & Lab Fund", amount: 200 },
        ];

  const lateFee = challan.lateFee || 500;
  const totalAfterDue = (challan.total || 0) + lateFee;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity no-print"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-6xl max-h-[94vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
        {/* Top Controls Header (Hidden during Print) */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 dark:bg-slate-800/60 dark:border-slate-800 no-print">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Official Bank Fee Challan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Challan #{challan.voucherNo} · {monthName} · {challan.studentName}
              </p>
            </div>
          </div>

          {/* Action Buttons & View Mode Toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center rounded-xl border border-slate-200 bg-white p-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode("3copy")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === "3copy"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                3-Copy Bank Challan
              </button>
              <button
                type="button"
                onClick={() => setViewMode("single")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === "single"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                Single Receipt
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary py-2 px-4 shadow-md font-semibold flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              <span>Print Challan</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-950/40">
          <div className="print-area max-w-5xl mx-auto">
            {viewMode === "3copy" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
                {/* 1. BANK COPY */}
                <div className="relative">
                  <ChallanSlip
                    type="BANK COPY"
                    badgeColor="bg-blue-600 text-white"
                    challan={challan}
                    formattedDueDate={formattedDueDate}
                    formattedIssueDate={formattedIssueDate}
                    monthName={monthName}
                    breakdownItems={breakdownItems}
                    lateFee={lateFee}
                    totalAfterDue={totalAfterDue}
                  />
                  {/* Scissor cut line indicator */}
                  <div className="hidden md:flex print:flex absolute -right-2 top-0 bottom-0 items-center justify-center pointer-events-none text-slate-300">
                    <span className="text-[10px] transform rotate-90 flex items-center gap-1 font-mono">
                      <Scissors className="h-3 w-3" /> ✂ - - - - - -
                    </span>
                  </div>
                </div>

                {/* 2. SCHOOL COPY */}
                <div className="relative">
                  <ChallanSlip
                    type="SCHOOL COPY"
                    badgeColor="bg-emerald-600 text-white"
                    challan={challan}
                    formattedDueDate={formattedDueDate}
                    formattedIssueDate={formattedIssueDate}
                    monthName={monthName}
                    breakdownItems={breakdownItems}
                    lateFee={lateFee}
                    totalAfterDue={totalAfterDue}
                  />
                  {/* Scissor cut line indicator */}
                  <div className="hidden md:flex print:flex absolute -right-2 top-0 bottom-0 items-center justify-center pointer-events-none text-slate-300">
                    <span className="text-[10px] transform rotate-90 flex items-center gap-1 font-mono">
                      <Scissors className="h-3 w-3" /> ✂ - - - - - -
                    </span>
                  </div>
                </div>

                {/* 3. STUDENT COPY */}
                <div>
                  <ChallanSlip
                    type="STUDENT COPY"
                    badgeColor="bg-purple-600 text-white"
                    challan={challan}
                    formattedDueDate={formattedDueDate}
                    formattedIssueDate={formattedIssueDate}
                    monthName={monthName}
                    breakdownItems={breakdownItems}
                    lateFee={lateFee}
                    totalAfterDue={totalAfterDue}
                  />
                </div>
              </div>
            ) : (
              /* Single Compact Slip */
              <div className="max-w-md mx-auto">
                <ChallanSlip
                  type="STUDENT COPY"
                  badgeColor="bg-brand-600 text-white"
                  challan={challan}
                  formattedDueDate={formattedDueDate}
                  formattedIssueDate={formattedIssueDate}
                  monthName={monthName}
                  breakdownItems={breakdownItems}
                  lateFee={lateFee}
                  totalAfterDue={totalAfterDue}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer info banner */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 bg-white text-xs text-slate-500 dark:bg-slate-900 dark:border-slate-800 no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Standard A4 3-Copy Bank Challan formatted for direct landscape printing.</span>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span>Apex SMS Fee System</span>
          </div>
        </div>
      </div>
    </div>
  );
}

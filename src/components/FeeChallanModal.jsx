import React, { useState } from "react";
import {
  Printer,
  X,
  School,
  Building2,
  Scissors,
  Check,
} from "lucide-react";

/**
 * Format currency in Pakistani Rupees with standard banking comma separation
 */
function formatPKR(num) {
  if (num == null || isNaN(num)) return "0";
  return Number(num).toLocaleString("en-PK");
}

/**
 * Single Professional Monochrome Bank Challan Slip
 * Designed following authentic commercial banking & institutional guidelines:
 * Strict high-contrast black & white, solid crisp borders, clean tabular data, zero gaudy colors.
 */
function ChallanSlip({
  type = "BANK COPY",
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
    <div
      style={{ backgroundColor: "#ffffff", color: "#000000", borderColor: "#000000" }}
      className="challan-sheet pure-white-paper flex flex-col justify-between border-2 border-black bg-white p-3 text-[10.5px] leading-tight text-black shadow-sm print:shadow-none print:border-black break-inside-avoid"
    >
      <div>
        {/* Institutional Bank Header */}
        <div className="border-b-2 border-black pb-2 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <School className="h-4 w-4 text-black shrink-0" />
            <h2 className="font-extrabold text-xs tracking-tight uppercase font-serif">
              Apex International School
            </h2>
          </div>
          <p className="text-[8.5px] text-neutral-700 tracking-tight">
            Main Campus, Gulberg III, Lahore · Tel: (042) 3578-9000
          </p>
          <div className="mt-1 border border-neutral-800 bg-neutral-50 py-0.5 px-1.5 text-[8.5px] font-semibold text-neutral-900 flex items-center justify-center gap-1">
            <Building2 className="h-3 w-3 shrink-0" />
            <span>Meezan Bank Ltd · A/C: 0102-0100456789 (Main Branch)</span>
          </div>

          {/* Copy Identification Tag */}
          <div className="mt-1.5 flex justify-center">
            <span className="border border-black bg-neutral-100 px-3 py-0.5 text-[9.5px] font-black uppercase tracking-widest text-black">
              [ {type} ]
            </span>
          </div>
        </div>

        {/* Challan Metadata Table Grid */}
        <table className="w-full mt-1.5 border border-black text-[9px] font-mono">
          <tbody>
            <tr className="border-b border-black bg-neutral-50">
              <td className="px-1.5 py-0.5 border-r border-black font-semibold text-neutral-600">
                Challan No:
              </td>
              <td className="px-1.5 py-0.5 border-r border-black font-bold text-black">
                {challan.voucherNo}
              </td>
              <td className="px-1.5 py-0.5 border-r border-black font-semibold text-neutral-600">
                Month:
              </td>
              <td className="px-1.5 py-0.5 font-bold text-black">
                {monthName}
              </td>
            </tr>
            <tr>
              <td className="px-1.5 py-0.5 border-r border-black font-semibold text-neutral-600">
                Issue Date:
              </td>
              <td className="px-1.5 py-0.5 border-r border-black">
                {formattedIssueDate}
              </td>
              <td className="px-1.5 py-0.5 border-r border-black font-semibold text-neutral-600">
                Due Date:
              </td>
              <td className="px-1.5 py-0.5 font-bold text-black">
                {formattedDueDate}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Student Information Grid */}
        <table className="w-full mt-1.5 border border-black text-[9.5px]">
          <tbody>
            <tr className="border-b border-neutral-300">
              <td className="px-1.5 py-1 w-24 text-neutral-600 font-medium">Student Name:</td>
              <td className="px-1.5 py-1 font-bold text-black uppercase" colSpan="3">
                {challan.studentName}
              </td>
            </tr>
            <tr className="border-b border-neutral-300">
              <td className="px-1.5 py-1 text-neutral-600 font-medium">Father / Guardian:</td>
              <td className="px-1.5 py-1 font-semibold text-neutral-900" colSpan="3">
                {challan.guardianName || "—"}
              </td>
            </tr>
            <tr className="border-b border-neutral-300">
              <td className="px-1.5 py-1 text-neutral-600 font-medium">Admission No:</td>
              <td className="px-1.5 py-1 font-mono font-bold">{challan.admissionNo}</td>
              <td className="px-1.5 py-1 w-16 text-neutral-600 font-medium border-l border-neutral-300">
                Roll No:
              </td>
              <td className="px-1.5 py-1 font-mono font-bold">{challan.rollNo || "—"}</td>
            </tr>
            <tr>
              <td className="px-1.5 py-1 text-neutral-600 font-medium">Class:</td>
              <td className="px-1.5 py-1 font-semibold">{challan.className}</td>
              <td className="px-1.5 py-1 text-neutral-600 font-medium border-l border-neutral-300">
                Section:
              </td>
              <td className="px-1.5 py-1 font-semibold">{challan.sectionName || "A"}</td>
            </tr>
          </tbody>
        </table>

        {/* Fee Particulars Table */}
        <div className="mt-1.5">
          <table className="w-full border border-black text-[9px]">
            <thead>
              <tr className="border-b border-black bg-neutral-100 font-bold text-black">
                <th className="px-1.5 py-1 text-left w-6 border-r border-black">#</th>
                <th className="px-1.5 py-1 text-left border-r border-black">Fee Particulars</th>
                <th className="px-1.5 py-1 text-right w-20">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 font-mono">
              {breakdownItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-1.5 py-0.5 text-center border-r border-neutral-300 text-neutral-500">
                    {idx + 1}
                  </td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-300 font-sans text-neutral-900">
                    {item.name}
                  </td>
                  <td className="px-1.5 py-0.5 text-right font-medium">
                    {formatPKR(item.amount)}
                  </td>
                </tr>
              ))}
              {challan.fine > 0 && (
                <tr>
                  <td className="px-1.5 py-0.5 text-center border-r border-neutral-300">!</td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-300 font-sans">
                    Previous Arrears / Late Fine
                  </td>
                  <td className="px-1.5 py-0.5 text-right font-medium">
                    {formatPKR(challan.fine)}
                  </td>
                </tr>
              )}
              {challan.discount > 0 && (
                <tr>
                  <td className="px-1.5 py-0.5 text-center border-r border-neutral-300">-</td>
                  <td className="px-1.5 py-0.5 border-r border-neutral-300 font-sans">
                    Fee Concession / Scholarship
                  </td>
                  <td className="px-1.5 py-0.5 text-right font-medium">
                    -{formatPKR(challan.discount)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals Summary Box */}
          <div className="mt-1 border-2 border-black font-mono text-[9.5px]">
            <div className="flex justify-between items-center px-1.5 py-1 bg-neutral-100 font-black border-b border-black">
              <span>Payable within Due Date:</span>
              <span className="text-[11px]">Rs. {formatPKR(challan.total)}</span>
            </div>
            <div className="flex justify-between items-center px-1.5 py-0.5 border-b border-neutral-300 text-[8.5px] text-neutral-700">
              <span>Late Fee Surcharge (After Due Date):</span>
              <span>Rs. {formatPKR(lateFee)}</span>
            </div>
            <div className="flex justify-between items-center px-1.5 py-1 font-bold bg-white">
              <span>Payable after Due Date:</span>
              <span>Rs. {formatPKR(totalAfterDue)}</span>
            </div>
          </div>
        </div>

        {/* Payment Status Notice / Official Stamp Box */}
        <div className="mt-1.5 border border-black p-1 text-center font-bold text-[9px]">
          {isPaid ? (
            <div className="uppercase">
              <span>✓ FEE PAID IN FULL · RS. {formatPKR(challan.paidAmount)}</span>
              {challan.paidAt && (
                <span className="block text-[8px] font-normal font-mono mt-0.5">
                  Paid Date: {challan.paidAt} ({challan.paymentMethod || "Cash"})
                </span>
              )}
            </div>
          ) : isPartial ? (
            <div className="uppercase">
              PARTIAL PAYMENT RECEIVED · REMAINING BALANCE: RS. {formatPKR(challan.balance)}
            </div>
          ) : (
            <div className="uppercase">
              UNPAID · PLEASE DEPOSIT ON OR BEFORE {formattedDueDate}
            </div>
          )}
        </div>

        {/* Banking Terms & Conditions */}
        <div className="mt-1 text-[7.5px] text-neutral-700 leading-tight space-y-0.5">
          <p>1. Payment is acceptable in Cash / 1Link at any Meezan Bank branch across Pakistan.</p>
          <p>2. Fee once deposited is strictly non-refundable and non-transferable.</p>
          <p>3. After the due date, late payment surcharge of Rs. {formatPKR(lateFee)} will be charged strictly.</p>
        </div>
      </div>

      {/* Dual Signature Fields */}
      <div className="mt-5 pt-3 border-t border-black flex justify-between text-[8.5px] text-neutral-800 font-sans">
        <div className="text-center">
          <div className="w-24 border-b border-neutral-600 mb-1"></div>
          <span>Depositor's Signature</span>
        </div>
        <div className="text-center">
          <div className="w-28 border-b border-neutral-600 mb-1"></div>
          <span>Bank Officer / Cashier Stamp</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 3-Copy Fee Challan Modal
 * Guaranteed Pure White Canvas (#FFFFFF) across all themes (no dark mode inversion on the printed document).
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
          { name: "Computer & Science Lab", amount: 300 },
          { name: "Exam & Library Charges", amount: 200 },
        ];

  const lateFee = challan.lateFee || 500;
  const totalAfterDue = (challan.total || 0) + lateFee;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 print:static print:block print:p-0">
      {/* Dark backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity no-print"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-6xl max-h-[95vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-300 overflow-hidden no-dark-inversion print:static print:max-h-none print:w-full print:border-none print:shadow-none print:rounded-none print:block print:overflow-visible">
        {/* Top Controls Header (Strictly hidden during window.print) */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-slate-50 no-print">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white shadow-sm">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Official Bank Fee Challan Preview
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Challan #{challan.voucherNo} · {monthName} · {challan.studentName}
              </p>
            </div>
          </div>

          {/* Action Buttons & View Mode Toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center rounded-lg border border-slate-300 bg-white p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode("3copy")}
                className={`px-3 py-1.5 rounded transition-all ${
                  viewMode === "3copy"
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                3-Copy Bank Challan
              </button>
              <button
                type="button"
                onClick={() => setViewMode("single")}
                className={`px-3 py-1.5 rounded transition-all ${
                  viewMode === "single"
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Single Slip
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="btn bg-neutral-900 hover:bg-black text-white py-1.5 px-4 shadow-sm font-semibold flex items-center gap-2 text-xs"
            >
              <Printer className="h-4 w-4" />
              <span>Print Document</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Preview Viewport: Crisp White Paper Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-200/60 print:p-0 print:bg-white print:overflow-visible">
          {/* Paper Sheet Representation */}
          <div
            style={{ backgroundColor: "#ffffff", color: "#000000" }}
            className="print-area challan-sheet pure-white-paper bg-white text-black p-4 sm:p-5 shadow-2xl border border-neutral-300 print:shadow-none print:border-none print:p-0 max-w-5xl mx-auto rounded-lg"
          >
            {viewMode === "3copy" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
                {/* 1. BANK COPY */}
                <div className="relative">
                  <ChallanSlip
                    type="BANK COPY"
                    challan={challan}
                    formattedDueDate={formattedDueDate}
                    formattedIssueDate={formattedIssueDate}
                    monthName={monthName}
                    breakdownItems={breakdownItems}
                    lateFee={lateFee}
                    totalAfterDue={totalAfterDue}
                  />
                  {/* Subtle cutting line divider */}
                  <div className="hidden md:flex print:flex absolute -right-2 top-0 bottom-0 items-center justify-center pointer-events-none text-neutral-400">
                    <span className="text-[9px] transform rotate-90 flex items-center gap-1 font-mono tracking-widest">
                      <Scissors className="h-3 w-3" /> ✂ - - - - - - - - ✂
                    </span>
                  </div>
                </div>

                {/* 2. SCHOOL COPY */}
                <div className="relative">
                  <ChallanSlip
                    type="SCHOOL COPY"
                    challan={challan}
                    formattedDueDate={formattedDueDate}
                    formattedIssueDate={formattedIssueDate}
                    monthName={monthName}
                    breakdownItems={breakdownItems}
                    lateFee={lateFee}
                    totalAfterDue={totalAfterDue}
                  />
                  {/* Subtle cutting line divider */}
                  <div className="hidden md:flex print:flex absolute -right-2 top-0 bottom-0 items-center justify-center pointer-events-none text-neutral-400">
                    <span className="text-[9px] transform rotate-90 flex items-center gap-1 font-mono tracking-widest">
                      <Scissors className="h-3 w-3" /> ✂ - - - - - - - - ✂
                    </span>
                  </div>
                </div>

                {/* 3. STUDENT COPY */}
                <div>
                  <ChallanSlip
                    type="STUDENT COPY"
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

        {/* Bottom Helper Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-2.5 bg-white text-[11px] text-slate-600 no-print">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Formatted for Standard A4 Landscape Paper (All Meezan Bank & 1Link Branches).</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
            <span>Apex International School ERP</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import {
  Printer,
  X,
  School,
  Building2,
  Scissors,
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
 * - Crisp outer perimeter
 * - Soft, subtle light gray inner borders (#cbd5e1 / #e2e8f0)
 * - Strict fixed-width tabular formatting (zero horizontal overflow or text clipping)
 * - Pure white background (#ffffff) across all themes and in window.print()
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
      style={{ backgroundColor: "#ffffff", color: "#000000" }}
      className="challan-sheet pure-white-paper min-w-0 w-full flex flex-col justify-between border border-slate-700 bg-white p-2 sm:p-2.5 text-[8.5px] leading-tight text-slate-900 shadow-sm print:shadow-none print:border-slate-800 break-inside-avoid box-sizing:border-box"
    >
      <div>
        {/* Institutional Bank Header */}
        <div className="border-b border-slate-300 pb-1.5 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <School className="h-3.5 w-3.5 text-slate-800 shrink-0" />
            <h2 className="font-extrabold text-[11px] sm:text-xs tracking-tight uppercase font-serif text-slate-900 whitespace-nowrap">
              Apex International School
            </h2>
          </div>
          <p className="text-[7.5px] text-slate-500 tracking-tight leading-none">
            Main Campus, Gulberg III, Lahore · Tel: (042) 3578-9000
          </p>
          <div className="mt-1 border border-slate-200 bg-slate-50 py-0.5 px-1 text-[7.5px] font-semibold text-slate-700 flex items-center justify-center gap-1 rounded-sm">
            <Building2 className="h-2.5 w-2.5 shrink-0 text-slate-600" />
            <span className="truncate">Meezan Bank Ltd · A/C: 0102-0100456789</span>
          </div>

          {/* Copy Identification Tag */}
          <div className="mt-1 flex justify-center">
            <span className="border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-slate-800 rounded-sm">
              [ {type} ]
            </span>
          </div>
        </div>

        {/* Challan Metadata Table Grid (Fixed Layout & Light Borders) */}
        <table className="w-full mt-1 border border-slate-300 text-[8px] table-fixed">
          <tbody>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              <td className="w-[28%] px-1 py-0.5 border-r border-slate-200 font-medium text-slate-500 truncate">
                Challan No:
              </td>
              <td className="w-[32%] px-1 py-0.5 border-r border-slate-200 font-bold font-mono text-slate-900 truncate">
                {challan.voucherNo}
              </td>
              <td className="w-[18%] px-1 py-0.5 border-r border-slate-200 font-medium text-slate-500 truncate">
                Month:
              </td>
              <td className="w-[22%] px-1 py-0.5 font-bold text-slate-900 truncate">
                {monthName}
              </td>
            </tr>
            <tr>
              <td className="px-1 py-0.5 border-r border-slate-200 font-medium text-slate-500 truncate">
                Issue Date:
              </td>
              <td className="px-1 py-0.5 border-r border-slate-200 font-mono text-slate-800 truncate">
                {formattedIssueDate}
              </td>
              <td className="px-1 py-0.5 border-r border-slate-200 font-medium text-slate-500 truncate">
                Due Date:
              </td>
              <td className="px-1 py-0.5 font-bold font-mono text-slate-900 truncate">
                {formattedDueDate}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Student Information Grid (Fixed Layout & Light Borders) */}
        <table className="w-full mt-1 border border-slate-300 text-[8px] table-fixed">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="w-[28%] px-1 py-0.5 text-slate-500 font-medium">Student Name:</td>
              <td className="w-[72%] px-1 py-0.5 font-bold text-slate-900 uppercase truncate" colSpan="3">
                {challan.studentName}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-1 py-0.5 text-slate-500 font-medium">Father / Guard:</td>
              <td className="px-1 py-0.5 font-semibold text-slate-800 truncate" colSpan="3">
                {challan.guardianName || "—"}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="w-[28%] px-1 py-0.5 text-slate-500 font-medium">Admission No:</td>
              <td className="w-[32%] px-1 py-0.5 font-mono font-bold text-slate-900 truncate">
                {challan.admissionNo}
              </td>
              <td className="w-[18%] px-1 py-0.5 text-slate-500 font-medium border-l border-slate-200">
                Roll No:
              </td>
              <td className="w-[22%] px-1 py-0.5 font-mono font-bold text-slate-900 truncate">
                {challan.rollNo || "—"}
              </td>
            </tr>
            <tr>
              <td className="px-1 py-0.5 text-slate-500 font-medium">Class:</td>
              <td className="px-1 py-0.5 font-semibold text-slate-800 truncate">
                {challan.className}
              </td>
              <td className="px-1 py-0.5 text-slate-500 font-medium border-l border-slate-200">
                Section:
              </td>
              <td className="px-1 py-0.5 font-semibold text-slate-800 truncate">
                {challan.sectionName || "A"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Fee Particulars Table */}
        <div className="mt-1">
          <table className="w-full border border-slate-300 text-[8px] table-fixed">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50 font-bold text-slate-800">
                <th className="w-5 px-1 py-0.5 text-center border-r border-slate-200">#</th>
                <th className="px-1.5 py-0.5 text-left border-r border-slate-200">Fee Particulars</th>
                <th className="w-16 px-1 py-0.5 text-right">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {breakdownItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-1 py-0.5 text-center border-r border-slate-200 text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="px-1.5 py-0.5 border-r border-slate-200 font-sans text-slate-800 truncate">
                    {item.name}
                  </td>
                  <td className="px-1 py-0.5 text-right font-medium text-slate-900">
                    {formatPKR(item.amount)}
                  </td>
                </tr>
              ))}
              {challan.fine > 0 && (
                <tr>
                  <td className="px-1 py-0.5 text-center border-r border-slate-200 text-amber-600 font-bold">!</td>
                  <td className="px-1.5 py-0.5 border-r border-slate-200 font-sans text-slate-800 truncate">
                    Previous Arrears / Late Fine
                  </td>
                  <td className="px-1 py-0.5 text-right font-medium text-slate-900">
                    {formatPKR(challan.fine)}
                  </td>
                </tr>
              )}
              {challan.discount > 0 && (
                <tr>
                  <td className="px-1 py-0.5 text-center border-r border-slate-200 text-emerald-600 font-bold">-</td>
                  <td className="px-1.5 py-0.5 border-r border-slate-200 font-sans text-slate-800 truncate">
                    Fee Concession / Discount
                  </td>
                  <td className="px-1 py-0.5 text-right font-medium text-emerald-700">
                    -{formatPKR(challan.discount)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals Summary Box */}
          <div className="mt-1 border border-slate-300 font-mono text-[8px]">
            <div className="flex justify-between items-center px-1.5 py-0.5 bg-slate-50 font-bold border-b border-slate-200">
              <span className="text-slate-800">Payable within Due Date:</span>
              <span className="text-[9.5px] font-black text-slate-900">Rs. {formatPKR(challan.total)}</span>
            </div>
            <div className="flex justify-between items-center px-1.5 py-0.5 border-b border-slate-100 text-[7px] text-slate-500">
              <span>Late Fee Surcharge (After Due Date):</span>
              <span>Rs. {formatPKR(lateFee)}</span>
            </div>
            <div className="flex justify-between items-center px-1.5 py-0.5 font-bold bg-white text-slate-800">
              <span>Payable after Due Date:</span>
              <span>Rs. {formatPKR(totalAfterDue)}</span>
            </div>
          </div>
        </div>

        {/* Payment Status Notice / Stamp Box */}
        <div className="mt-1 border border-slate-300 p-0.5 text-center font-bold text-[7.5px] bg-slate-50/70 rounded-sm">
          {isPaid ? (
            <div className="uppercase text-emerald-700">
              <span>✓ FEE PAID IN FULL · RS. {formatPKR(challan.paidAmount)}</span>
              {challan.paidAt && (
                <span className="block text-[6.5px] font-normal font-mono text-slate-600 mt-0.5">
                  Paid Date: {challan.paidAt} ({challan.paymentMethod || "Cash"})
                </span>
              )}
            </div>
          ) : isPartial ? (
            <div className="uppercase text-amber-700">
              PARTIAL PAYMENT RECEIVED · REMAINING: RS. {formatPKR(challan.balance)}
            </div>
          ) : (
            <div className="uppercase text-slate-700">
              UNPAID · PLEASE DEPOSIT ON OR BEFORE {formattedDueDate}
            </div>
          )}
        </div>

        {/* Banking Terms & Conditions */}
        <div className="mt-1 text-[6.8px] text-slate-500 leading-tight space-y-0.5">
          <p>1. Payment acceptable in Cash / 1Link at any Meezan Bank branch across Pakistan.</p>
          <p>2. Fee once deposited is strictly non-refundable and non-transferable.</p>
          <p>3. After due date, late payment surcharge of Rs. {formatPKR(lateFee)} will be charged.</p>
        </div>
      </div>

      {/* Dual Signature Fields */}
      <div className="mt-3 pt-2 border-t border-slate-300 flex justify-between text-[7.5px] text-slate-600 font-sans">
        <div className="text-center">
          <div className="w-20 border-b border-slate-400 mb-0.5"></div>
          <span>Depositor's Sign</span>
        </div>
        <div className="text-center">
          <div className="w-24 border-b border-slate-400 mb-0.5"></div>
          <span>Bank / Cashier Stamp</span>
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
      <div className="relative z-10 w-full max-w-7xl max-h-[96vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-300 overflow-hidden no-dark-inversion print:static print:max-h-none print:w-full print:border-none print:shadow-none print:rounded-none print:block print:overflow-visible">
        {/* Top Controls Header (Strictly hidden during window.print) */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-3 bg-slate-50 no-print">
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
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center rounded-lg border border-slate-300 bg-white p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode("3copy")}
                className={`px-3 py-1.5 rounded transition-all ${viewMode === "3copy"
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                3-Copy Bank Challan
              </button>
              <button
                type="button"
                onClick={() => setViewMode("single")}
                className={`px-3 py-1.5 rounded transition-all ${viewMode === "single"
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
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-neutral-200/60 print:p-0 print:bg-white print:overflow-visible">
          {/* Paper Sheet Representation */}
          <div
            style={{ backgroundColor: "#ffffff", color: "#000000" }}
            className="print-area challan-sheet pure-white-paper bg-white text-black p-3 sm:p-4 shadow-xl border border-neutral-300 print:shadow-none print:border-none print:p-0 w-full mx-auto rounded-lg"
          >
            {viewMode === "3copy" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-2.5 print:grid-cols-3 print:gap-1.5 w-full">
                {/* 1. BANK COPY */}
                <div className="min-w-0 relative">
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
                  {/* Subtle cutting line divider on desktop & print */}
                  <div className="hidden md:block print:block absolute -right-[5px] top-2 bottom-2 border-r border-dashed border-slate-300 pointer-events-none z-10">
                    <div className="absolute -top-1.5 -left-1.5 text-slate-400">
                      <Scissors className="h-2.5 w-2.5" />
                    </div>
                    <div className="absolute -bottom-1.5 -left-1.5 text-slate-400">
                      <Scissors className="h-2.5 w-2.5" />
                    </div>
                  </div>
                </div>

                {/* 2. SCHOOL COPY */}
                <div className="min-w-0 relative">
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
                  {/* Subtle cutting line divider on desktop & print */}
                  <div className="hidden md:block print:block absolute -right-[5px] top-2 bottom-2 border-r border-dashed border-slate-300 pointer-events-none z-10">
                    <div className="absolute -top-1.5 -left-1.5 text-slate-400">
                      <Scissors className="h-2.5 w-2.5" />
                    </div>
                    <div className="absolute -bottom-1.5 -left-1.5 text-slate-400">
                      <Scissors className="h-2.5 w-2.5" />
                    </div>
                  </div>
                </div>

                {/* 3. STUDENT COPY */}
                <div className="min-w-0">
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
        <div className="flex items-center justify-between border-t border-slate-200 px-4 sm:px-6 py-2 bg-white text-[11px] text-slate-600 no-print">
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

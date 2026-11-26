import { apiFetch } from "./api-client";

export async function fetchNoticesAPI(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append("page", params.page);
  if (params.limit) query.append("limit", params.limit);
  if (params.status && params.status !== "All") query.append("status", params.status);
  if (params.q) query.append("q", params.q);
  if (params.role && params.role !== "All") query.append("role", params.role);
  if (params.classId && params.classId !== "All") query.append("classId", params.classId);

  return await apiFetch(`/api/v1/notices?${query.toString()}`);
}

export async function getNoticeByIdAPI(id) {
  return await apiFetch(`/api/v1/notices/${id}`);
}

export async function createNoticeAPI(data) {
  return await apiFetch("/api/v1/notices", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateNoticeAPI(id, data) {
  return await apiFetch(`/api/v1/notices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteNoticeAPI(id) {
  return await apiFetch(`/api/v1/notices/${id}`, {
    method: "DELETE",
  });
}

/**
 * Generate a WhatsApp share link for manual fee reminders per project-overview.md
 */
export function generateFeeReminderWhatsAppUrl({
  parentPhone,
  parentName,
  studentName,
  voucherNo,
  period,
  balance,
  dueDate,
  schoolName = "Apex International School",
}) {
  // Format international Pakistani phone number (e.g. 03001234567 -> 923001234567)
  const cleanPhone = (parentPhone || "").replace(/\D/g, "");
  let formattedPhone = cleanPhone;
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "92" + formattedPhone.slice(1);
  }

  const message = `Assalamu Alaikum ${parentName ? "Respected " + parentName : "Dear Parent"},\n\nThis is a polite fee reminder from *${schoolName}*.\n\nStudent: *${studentName}*\nVoucher No: *${voucherNo}*\nBilling Period: *${period}*\nOutstanding Amount: *Rs ${balance.toLocaleString()}*\nDue Date: *${dueDate || "Immediate"}*\n\nPlease clear the outstanding dues at the school accounts office or online to avoid late fee surcharges.\n\nThank you,\nAdministration Office\n${schoolName}`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generate a WhatsApp share link for a school notice
 */
export function generateNoticeWhatsAppUrl({
  title,
  body,
  schoolName = "Apex International School",
}) {
  const message = `*ANNOUNCEMENT — ${schoolName}*\n\n*${title}*\n\n${body}\n\n— Apex International School Management`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

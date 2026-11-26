import { apiFetch } from "./api-client";

export async function fetchVouchersAPI(params = {}) {
  const query = new URLSearchParams();
  if (params.period && params.period !== "All") query.append("period", params.period);
  if (params.classId && params.classId !== "All") query.append("classId", params.classId);
  if (params.sectionId && params.sectionId !== "All") query.append("sectionId", params.sectionId);
  if (params.status && params.status !== "All") query.append("status", params.status);
  if (params.q) query.append("q", params.q);
  if (params.page) query.append("page", params.page);
  if (params.limit) query.append("limit", params.limit);

  return await apiFetch(`/api/v1/fees/vouchers?${query.toString()}`);
}

export async function generateVouchersAPI(data) {
  return await apiFetch("/api/v1/fees/vouchers/generate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getVoucherByIdAPI(id) {
  return await apiFetch(`/api/v1/fees/vouchers/${id}`);
}

export async function recordPaymentAPI(voucherId, data) {
  return await apiFetch(`/api/v1/fees/vouchers/${voucherId}/payments`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function reversePaymentAPI(paymentId, data) {
  return await apiFetch(`/api/v1/fees/payments/${paymentId}/reverse`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchDefaultersAPI(params = {}) {
  const query = new URLSearchParams();
  if (params.classId && params.classId !== "All") query.append("classId", params.classId);
  if (params.sectionId && params.sectionId !== "All") query.append("sectionId", params.sectionId);
  if (params.minDaysOverdue) query.append("minDaysOverdue", params.minDaysOverdue);

  return await apiFetch(`/api/v1/fees/defaulters?${query.toString()}`);
}

export async function fetchFeeStructuresAPI(params = {}) {
  const query = new URLSearchParams();
  if (params.academicYearId) query.append("academicYearId", params.academicYearId);

  return await apiFetch(`/api/v1/fees/structures?${query.toString()}`);
}

export async function saveFeeStructureAPI(data) {
  return await apiFetch("/api/v1/fees/structures", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

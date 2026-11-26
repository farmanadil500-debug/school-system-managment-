import { apiFetch } from "./api-client";

export async function fetchStaffAPI(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append("page", params.page);
  if (params.limit) query.append("limit", params.limit);
  if (params.staffType && params.staffType !== "All") query.append("staffType", params.staffType);
  if (params.status && params.status !== "All") query.append("status", params.status);
  if (params.q) query.append("q", params.q);

  return await apiFetch(`/api/v1/staff?${query.toString()}`);
}

export async function createStaffAPI(data) {
  return await apiFetch("/api/v1/staff", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getStaffByIdAPI(id) {
  return await apiFetch(`/api/v1/staff/${id}`);
}

export async function updateStaffAPI(id, updates) {
  return await apiFetch(`/api/v1/staff/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteStaffAPI(id) {
  return await apiFetch(`/api/v1/staff/${id}`, {
    method: "DELETE",
  });
}

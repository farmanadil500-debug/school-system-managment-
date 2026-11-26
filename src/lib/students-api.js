import { apiFetch } from "./api-client";

export async function fetchStudentsAPI(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append("page", params.page);
  if (params.limit) query.append("limit", params.limit);
  if (params.classId && params.classId !== "All") query.append("classId", params.classId);
  if (params.sectionId && params.sectionId !== "All") query.append("sectionId", params.sectionId);
  if (params.academicYearId) query.append("academicYearId", params.academicYearId);
  if (params.status && params.status !== "All") query.append("status", params.status);
  if (params.q) query.append("q", params.q);

  const res = await apiFetch(`/api/v1/students?${query.toString()}`);
  return res;
}

export async function admitStudentAPI(data) {
  return await apiFetch("/api/v1/students/admission", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateStudentAPI(id, updates) {
  return await apiFetch(`/api/v1/students/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function getStudentByIdAPI(id) {
  return await apiFetch(`/api/v1/students/${id}`);
}

export async function promoteStudentsAPI(data) {
  return await apiFetch("/api/v1/students/promote", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function downloadStudentsCSVAPI(filters = {}) {
  const query = new URLSearchParams();
  if (filters.classId && filters.classId !== "All") query.append("classId", filters.classId);
  if (filters.sectionId && filters.sectionId !== "All") query.append("sectionId", filters.sectionId);

  const API_BASE = import.meta.env.VITE_API_URL || "";
  const url = `${API_BASE}/api/v1/students/export/csv?${query.toString()}`;

  const res = await fetch(url, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to export students CSV");
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `students_roster_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}

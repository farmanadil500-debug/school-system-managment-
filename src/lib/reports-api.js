import { apiFetch } from "./api-client";

export async function fetchDashboardStatsAPI() {
  return await apiFetch("/api/v1/dashboard/stats");
}

export async function fetchAttendanceReportAPI(params = {}) {
  const query = new URLSearchParams();
  if (params.academicYearId) query.append("academicYearId", params.academicYearId);
  if (params.classId && params.classId !== "All") query.append("classId", params.classId);
  if (params.sectionId && params.sectionId !== "All") query.append("sectionId", params.sectionId);
  if (params.startDate) query.append("startDate", params.startDate);
  if (params.endDate) query.append("endDate", params.endDate);

  return await apiFetch(`/api/v1/reports/attendance?${query.toString()}`);
}

export async function downloadAttendanceReportCSV(params = {}) {
  const query = new URLSearchParams();
  if (params.academicYearId) query.append("academicYearId", params.academicYearId);
  if (params.classId && params.classId !== "All") query.append("classId", params.classId);
  if (params.sectionId && params.sectionId !== "All") query.append("sectionId", params.sectionId);
  if (params.startDate) query.append("startDate", params.startDate);
  if (params.endDate) query.append("endDate", params.endDate);

  const res = await fetch(`/api/v1/reports/attendance/export/csv?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${window.__access_token || ""}`,
    },
  });

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchFeeReportAPI(params = {}) {
  const query = new URLSearchParams();
  if (params.academicYearId) query.append("academicYearId", params.academicYearId);
  if (params.classId && params.classId !== "All") query.append("classId", params.classId);
  if (params.period && params.period !== "All") query.append("period", params.period);
  if (params.status && params.status !== "All") query.append("status", params.status);

  return await apiFetch(`/api/v1/reports/fees?${query.toString()}`);
}

export async function downloadFeeReportCSV(params = {}) {
  const query = new URLSearchParams();
  if (params.academicYearId) query.append("academicYearId", params.academicYearId);
  if (params.classId && params.classId !== "All") query.append("classId", params.classId);
  if (params.period && params.period !== "All") query.append("period", params.period);
  if (params.status && params.status !== "All") query.append("status", params.status);

  const res = await fetch(`/api/v1/reports/fees/export/csv?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${window.__access_token || ""}`,
    },
  });

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fees-revenue-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchExamReportAPI(params = {}) {
  const query = new URLSearchParams();
  if (params.examId) query.append("examId", params.examId);
  if (params.classId && params.classId !== "All") query.append("classId", params.classId);
  if (params.sectionId && params.sectionId !== "All") query.append("sectionId", params.sectionId);

  return await apiFetch(`/api/v1/reports/exams?${query.toString()}`);
}

export async function downloadExamReportCSV(params = {}) {
  const query = new URLSearchParams();
  if (params.examId) query.append("examId", params.examId);
  if (params.classId && params.classId !== "All") query.append("classId", params.classId);
  if (params.sectionId && params.sectionId !== "All") query.append("sectionId", params.sectionId);

  const res = await fetch(`/api/v1/reports/exams/export/csv?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${window.__access_token || ""}`,
    },
  });

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `exam-results-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

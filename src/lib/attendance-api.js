import { apiFetch } from "./api-client";

export async function fetchSectionAttendanceAPI({ sectionId, date }) {
  const query = new URLSearchParams();
  if (sectionId) query.append("sectionId", sectionId);
  if (date) query.append("date", date);

  return await apiFetch(`/api/v1/attendance/section?${query.toString()}`);
}

export async function markSectionAttendanceAPI(data) {
  return await apiFetch("/api/v1/attendance/bulk", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchAttendanceHistoryAPI(params = {}) {
  const query = new URLSearchParams();
  if (params.sectionId && params.sectionId !== "All") query.append("sectionId", params.sectionId);
  if (params.classId && params.classId !== "All") query.append("classId", params.classId);
  if (params.startDate) query.append("startDate", params.startDate);
  if (params.endDate) query.append("endDate", params.endDate);
  if (params.limit) query.append("limit", params.limit);

  return await apiFetch(`/api/v1/attendance/history?${query.toString()}`);
}

export async function fetchStudentAttendanceAPI(studentId, params = {}) {
  const query = new URLSearchParams();
  if (params.month) query.append("month", params.month);
  if (params.academicYearId) query.append("academicYearId", params.academicYearId);

  return await apiFetch(`/api/v1/attendance/student/${studentId}?${query.toString()}`);
}

export async function fetchLowAttendanceListAPI(params = {}) {
  const query = new URLSearchParams();
  if (params.sectionId && params.sectionId !== "All") query.append("sectionId", params.sectionId);
  if (params.threshold) query.append("threshold", params.threshold);

  return await apiFetch(`/api/v1/attendance/low-attendance?${query.toString()}`);
}

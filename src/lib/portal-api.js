import { apiFetch } from "./api-client";

/**
 * Fetch linked children for the current logged-in parent,
 * or self profile for a logged-in student.
 */
export async function fetchMyChildrenAPI() {
  return await apiFetch("/api/v1/portal/children");
}

/**
 * Fetch detailed profile for a specific child/student.
 */
export async function fetchStudentProfileAPI(studentId) {
  return await apiFetch(`/api/v1/portal/student/${studentId}`);
}

/**
 * Fetch attendance logs and monthly attendance statistics for a student.
 */
export async function fetchStudentAttendanceAPI(studentId, month) {
  const query = month ? `?month=${encodeURIComponent(month)}` : "";
  return await apiFetch(`/api/v1/portal/student/${studentId}/attendance${query}`);
}

/**
 * Fetch fee vouchers, payments, and balances for a student.
 */
export async function fetchStudentFeesAPI(studentId, params = {}) {
  const query = new URLSearchParams();
  if (params.status && params.status !== "All") query.append("status", params.status);
  if (params.period && params.period !== "All") query.append("period", params.period);

  const qs = query.toString() ? `?${query.toString()}` : "";
  return await apiFetch(`/api/v1/portal/student/${studentId}/fees${qs}`);
}

/**
 * Fetch weekly timetable schedule for the student's enrolled section.
 */
export async function fetchStudentTimetableAPI(studentId) {
  return await apiFetch(`/api/v1/portal/student/${studentId}/timetable`);
}

/**
 * Fetch published exam results and report cards for a student.
 */
export async function fetchStudentExamsAPI(studentId) {
  return await apiFetch(`/api/v1/portal/student/${studentId}/exams`);
}

/**
 * Fetch school notices targeted to this student's class, section, or role.
 */
export async function fetchStudentNoticesAPI(studentId) {
  return await apiFetch(`/api/v1/portal/student/${studentId}/notices`);
}

import { apiFetch } from "./api-client";

export async function fetchExamsAPI(params = {}) {
  const query = new URLSearchParams();
  if (params.academicYearId) query.append("academicYearId", params.academicYearId);
  if (params.status && params.status !== "All") query.append("status", params.status);

  return await apiFetch(`/api/v1/exams?${query.toString()}`);
}

export async function createExamAPI(data) {
  return await apiFetch("/api/v1/exams", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getExamByIdAPI(id) {
  return await apiFetch(`/api/v1/exams/${id}`);
}

export async function updateExamAPI(id, data) {
  return await apiFetch(`/api/v1/exams/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function addExamSubjectAPI(examId, data) {
  return await apiFetch(`/api/v1/exams/${examId}/subjects`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function enterMarksAPI(examId, data) {
  return await apiFetch(`/api/v1/exams/${examId}/marks`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchSectionMarksAPI(examId, sectionId, subjectId) {
  return await apiFetch(
    `/api/v1/exams/${examId}/sections/${sectionId}/subjects/${subjectId}/marks`
  );
}

export async function fetchStudentReportCardAPI(examId, studentId) {
  return await apiFetch(
    `/api/v1/exams/${examId}/students/${studentId}/report-card`
  );
}

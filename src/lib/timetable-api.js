import { apiFetch } from "./api-client";

export async function fetchSectionTimetableAPI(sectionId, params = {}) {
  const query = new URLSearchParams();
  if (params.academicYearId) query.append("academicYearId", params.academicYearId);
  if (params.day && params.day !== "all") query.append("day", params.day);

  return await apiFetch(`/api/v1/timetables/section/${sectionId}?${query.toString()}`);
}

export async function fetchTeacherTimetableAPI(staffId, params = {}) {
  const query = new URLSearchParams();
  if (params.academicYearId) query.append("academicYearId", params.academicYearId);
  if (params.day && params.day !== "all") query.append("day", params.day);

  return await apiFetch(`/api/v1/timetables/teacher/${staffId}?${query.toString()}`);
}

export async function createTimetableSlotAPI(data) {
  return await apiFetch("/api/v1/timetables/slots", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTimetableSlotAPI(id, data) {
  return await apiFetch(`/api/v1/timetables/slots/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function bulkSaveTimetableAPI(data) {
  return await apiFetch("/api/v1/timetables/bulk", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteTimetableSlotAPI(id) {
  return await apiFetch(`/api/v1/timetables/slots/${id}`, {
    method: "DELETE",
  });
}

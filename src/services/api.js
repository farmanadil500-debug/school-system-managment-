const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");

export async function fetchStudentsFromAPI() {
  const res = await fetch(`${API_BASE}/students`);
  if (!res.ok) {
    throw new Error(`Failed to fetch students: ${res.statusText}`);
  }
  return await res.json();
}

export async function createStudentAPI(studentData) {
  const res = await fetch(`${API_BASE}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(studentData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to create student");
  }
  return await res.json();
}

export async function updateStudentAPI(id, studentData) {
  const res = await fetch(`${API_BASE}/students/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(studentData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update student");
  }
  return await res.json();
}

export async function deleteStudentAPI(id) {
  const res = await fetch(`${API_BASE}/students/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to delete student");
  }
  return await res.json();
}

// ATTENDANCE APIS
export async function fetchAttendanceAPI(date, className, section) {
  const url = `${API_BASE}/attendance?date=${encodeURIComponent(date)}&class=${encodeURIComponent(className)}&section=${encodeURIComponent(section)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch attendance: ${res.statusText}`);
  }
  return await res.json();
}

export async function saveAttendanceAPI(attendanceData) {
  const res = await fetch(`${API_BASE}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(attendanceData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to save attendance");
  }
  return await res.json();
}

export async function checkServerHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) return { online: false };
    const data = await res.json();
    return { online: true, ...data };
  } catch (err) {
    return { online: false, error: err.message };
  }
}


const API_BASE = "http://localhost:5000/api";

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


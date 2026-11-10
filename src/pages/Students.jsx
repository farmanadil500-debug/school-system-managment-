import React, { useMemo, useState } from "react";
import { Plus, Search, Eye, Pencil, Trash2, Users, Filter, Phone, Download, Printer, Save, Check } from "lucide-react";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { Avatar, EmptyState, SectionHeader, StatusBadge } from "../components/ui";
import { CLASSES, SECTIONS } from "../data/mock";
import { createStudentAPI, updateStudentAPI, deleteStudentAPI } from "../services/api";

const GENDERS = ["Male", "Female"];
const STATUS_OPTIONS = ["Active", "Inactive"];

const emptyForm = {
  name: "",
  rollNo: "",
  class: "Grade 1",
  section: "A",
  gender: "Male",
  parentName: "",
  phone: "",
  admissionDate: new Date().toISOString().slice(0, 10),
  status: "Active",
  feeStatus: "Pending",
  feeAmount: 4500,
  email: "",
  address: "",
  bloodGroup: "A+",
};

export default function Students({ students, setStudents, globalQuery, openAdd, onCloseAdd, onView }) {
  const { push } = useToast();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("All");

  // Add form state
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  // Edit form state
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editErrors, setEditErrors] = useState({});

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const q = (globalQuery || search || "").toLowerCase();
      const matchQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.rollNo.toString().includes(q) ||
        s.parentName.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q);
      const matchClass = classFilter === "All" || s.class === classFilter;
      return matchQ && matchClass;
    });
  }, [students, globalQuery, search, classFilter]);

  // Validation helper
  const validateForm = (data, setErr) => {
    const e = {};
    if (!data.name.trim()) e.name = "Student name is required";
    if (!data.rollNo || isNaN(Number(data.rollNo))) e.rollNo = "Valid roll number is required";
    if (!data.parentName.trim()) e.parentName = "Parent name is required";
    if (!data.phone.trim()) e.phone = "Phone number is required";
    setErr(e);
    return Object.keys(e).length === 0;
  };

  // Submit Add New Student
  const submitAdd = async () => {
    if (!validateForm(form, setErrors)) return;
    const newStudentData = {
      ...form,
      rollNo: Number(form.rollNo),
      feeAmount: Number(form.feeAmount || 4500),
      email: form.email || form.name.toLowerCase().replace(/\s+/g, ".") + "@apex.edu",
      address: form.address || "Gulberg, Lahore",
    };

    try {
      const saved = await createStudentAPI(newStudentData);
      setStudents((prev) => [saved, ...prev]);
      push(`Student "${saved.name}" added successfully!`, "success");
    } catch (err) {
      console.warn("Backend API offline or error, saving locally:", err.message);
      const localStudent = { ...newStudentData, id: Date.now() };
      setStudents((prev) => [localStudent, ...prev]);
      push(`Student "${localStudent.name}" added locally!`, "success");
    }

    setForm(emptyForm);
    onCloseAdd();
  };

  // Open Edit Modal
  const openEdit = (student) => {
    setEditTarget(student);
    setEditForm({
      name: student.name || "",
      rollNo: student.rollNo || "",
      class: student.class || "Grade 1",
      section: student.section || "A",
      gender: student.gender || "Male",
      parentName: student.parentName || "",
      phone: student.phone || "",
      admissionDate: student.admissionDate || new Date().toISOString().slice(0, 10),
      status: student.status || "Active",
      feeStatus: student.feeStatus || "Pending",
      feeAmount: student.feeAmount || 4500,
      email: student.email || "",
      address: student.address || "",
      bloodGroup: student.bloodGroup || "A+",
    });
    setEditErrors({});
  };

  // Submit Edit
  const submitEdit = async () => {
    if (!validateForm(editForm, setEditErrors)) return;
    const targetId = editTarget.id || editTarget._id;
    const updatedData = {
      ...editForm,
      rollNo: Number(editForm.rollNo),
      feeAmount: Number(editForm.feeAmount || 4500),
    };

    try {
      await updateStudentAPI(targetId, updatedData);
      setStudents((prev) =>
        prev.map((s) => ((s.id === targetId || s._id === targetId) ? { ...s, ...updatedData } : s))
      );
      push(`Student "${updatedData.name}" updated successfully!`, "success");
    } catch (err) {
      console.warn("Backend API offline or error, updating locally:", err.message);
      setStudents((prev) =>
        prev.map((s) => ((s.id === targetId || s._id === targetId) ? { ...s, ...updatedData } : s))
      );
      push(`Student "${updatedData.name}" updated!`, "success");
    }

    setEditTarget(null);
  };

  // Remove Student
  const removeStudent = async (id) => {
    try {
      await deleteStudentAPI(id);
      push("Student removed from directory", "info");
    } catch (err) {
      console.warn("Backend API offline or error, deleting locally:", err.message);
      push("Student removed locally", "info");
    }
    setStudents((prev) => prev.filter((s) => s.id !== id && s._id !== id));
    setDeleteTarget(null);
  };

  // Export to CSV Function
  const exportToCSV = () => {
    if (filtered.length === 0) {
      push("No students to export.", "warning");
      return;
    }
    const headers = ["Roll No", "Name", "Class", "Section", "Gender", "Parent Name", "Phone", "Status", "Fee Status", "Admission Date"];
    const rows = filtered.map((s) => [
      s.rollNo,
      `"${(s.name || "").replace(/"/g, '""')}"`,
      `"${s.class || ""}"`,
      `"${s.section || ""}"`,
      `"${s.gender || ""}"`,
      `"${(s.parentName || "").replace(/"/g, '""')}"`,
      `"${s.phone || ""}"`,
      `"${s.status || ""}"`,
      `"${s.feeStatus || ""}"`,
      `"${s.admissionDate || ""}"`,
    ]);

    const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `apex_students_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    push(`Exported ${filtered.length} students to CSV!`, "success");
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Students Directory"
        subtitle={`${students.length} students enrolled · Manage admissions & records`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-secondary" onClick={exportToCSV} title="Download students as Excel / CSV file">
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button className="btn-primary" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Student
            </button>
          </div>
        }
      />

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={globalQuery || search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, roll no, parent, phone…"
              className="input pl-10"
              disabled={!!globalQuery}
            />
            {globalQuery && <p className="mt-1 text-xs text-slate-400">Driven by global search</p>}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="input w-auto">
              <option value="All">All Classes</option>
              {CLASSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students found"
            subtitle="Try adjusting your search or filter, or add a new student to the directory."
            action={
              <button className="btn-primary" onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add Student
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead className="bg-slate-50/70">
                <tr>
                  <th>Student</th>
                  <th>Roll No</th>
                  <th>Class</th>
                  <th>Parent</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id || s._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} />
                        <div>
                          <p className="font-semibold text-slate-800">{s.name}</p>
                          <p className="text-xs text-slate-500">Admitted {s.admissionDate}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700">
                        #{s.rollNo}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-slate-100 text-slate-600">
                        {s.class} · {s.section}
                      </span>
                    </td>
                    <td className="text-slate-600">{s.parentName}</td>
                    <td>
                      <span className="text-slate-600 text-sm">{s.phone}</span>
                    </td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onView(s)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-brand-50 hover:text-brand-600 transition"
                          title="View Profile & Print Card"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(s)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition"
                          title="Edit Student"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Delete Student"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD STUDENT MODAL */}
      <Modal
        open={openAdd}
        onClose={onCloseAdd}
        title="Add New Student"
        subtitle="Register a new admission into the school directory"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={onCloseAdd}>Cancel</button>
            <button className="btn-primary" onClick={submitAdd}>
              <Plus className="h-4 w-4" /> Add Student
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name" error={errors.name}>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Ayesha Khan"
            />
          </Field>
          <Field label="Roll Number" error={errors.rollNo}>
            <input
              className="input"
              type="number"
              value={form.rollNo}
              onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
              placeholder="e.g. 101"
            />
          </Field>
          <Field label="Class">
            <select className="input" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })}>
              {CLASSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Section">
            <select className="input" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
              {SECTIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Gender">
            <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              {GENDERS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="Admission Date">
            <input
              type="date"
              className="input"
              value={form.admissionDate}
              onChange={(e) => setForm({ ...form, admissionDate: e.target.value })}
            />
          </Field>
          <Field label="Parent / Guardian Name" error={errors.parentName}>
            <input
              className="input"
              value={form.parentName}
              onChange={(e) => setForm({ ...form, parentName: e.target.value })}
              placeholder="e.g. Mr. Tariq Khan"
            />
          </Field>
          <Field label="Phone Number" error={errors.phone}>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g. +92 300 123 4567"
            />
          </Field>
        </div>
      </Modal>

      {/* EDIT STUDENT MODAL */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Edit Student: ${editTarget?.name || ""}`}
        subtitle="Update student details, class, or contact information"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
            <button className="btn-primary" onClick={submitEdit}>
              <Save className="h-4 w-4" /> Save Changes
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name" error={editErrors.name}>
            <input
              className="input"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
          </Field>
          <Field label="Roll Number" error={editErrors.rollNo}>
            <input
              className="input"
              type="number"
              value={editForm.rollNo}
              onChange={(e) => setEditForm({ ...editForm, rollNo: e.target.value })}
            />
          </Field>
          <Field label="Class">
            <select
              className="input"
              value={editForm.class}
              onChange={(e) => setEditForm({ ...editForm, class: e.target.value })}
            >
              {CLASSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Section">
            <select
              className="input"
              value={editForm.section}
              onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
            >
              {SECTIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Gender">
            <select
              className="input"
              value={editForm.gender}
              onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
            >
              {GENDERS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              className="input"
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st}>{st}</option>
              ))}
            </select>
          </Field>
          <Field label="Parent / Guardian Name" error={editErrors.parentName}>
            <input
              className="input"
              value={editForm.parentName}
              onChange={(e) => setEditForm({ ...editForm, parentName: e.target.value })}
            />
          </Field>
          <Field label="Phone Number" error={editErrors.phone}>
            <input
              className="input"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
          </Field>
          <Field label="Email Address">
            <input
              className="input"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
          </Field>
          <Field label="Residential Address">
            <input
              className="input"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Deletion"
        subtitle="This action cannot be undone"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button
              className="btn bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => removeStudent(deleteTarget?.id || deleteTarget?._id)}
            >
              <Trash2 className="h-4 w-4" /> Delete Student
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to remove{" "}
          <strong className="text-slate-900">{deleteTarget?.name}</strong> (Roll #{deleteTarget?.rollNo}) from the school directory?
        </p>
      </Modal>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

export function StudentProfileModal({ student, onClose }) {
  if (!student) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      open={!!student}
      onClose={onClose}
      title="Student Profile & ID Card"
      subtitle={`${student.class} · Section ${student.section}`}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <button className="btn-secondary" onClick={handlePrint} title="Print ID Card">
            <Printer className="h-4 w-4" /> Print ID Card
          </button>
          <button className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div id="printable-id-card" className="space-y-4 print-area bg-white p-4 rounded-2xl">
        {/* ID Card Header */}
        <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-brand-50 to-slate-50 p-5 ring-1 ring-brand-100">
          <Avatar name={student.name} size="lg" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{student.name}</h3>
              <span className="badge bg-brand-100 text-brand-700 font-mono text-xs">
                Roll #{student.rollNo}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-600">{student.class} · Section {student.section} · {student.gender}</p>
            <p className="mt-1 text-xs text-slate-500">Admitted on {student.admissionDate}</p>
          </div>
        </div>

        {/* Student Details Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoRow label="Parent / Guardian" value={student.parentName} />
          <InfoRow label="Emergency Phone" value={student.phone} icon={<Phone className="h-4 w-4" />} />
          <InfoRow label="Official Email" value={student.email || "—"} />
          <InfoRow label="Blood Group" value={student.bloodGroup || "—"} />
          <InfoRow label="Residential Address" value={student.address || "—"} full />
          <InfoRow label="Enrollment Status" value={<StatusBadge status={student.status} />} />
          <InfoRow
            label="Fee Status"
            value={
              <span
                className={`badge ${
                  student.feeStatus === "Paid"
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : student.feeStatus === "Overdue"
                    ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                }`}
              >
                {student.feeStatus || "Pending"}
              </span>
            }
          />
        </div>
      </div>
    </Modal>
  );
}

function InfoRow({ label, value, icon, full = false }) {
  return (
    <div className={`rounded-xl border border-slate-100 bg-slate-50/50 p-3 ${full ? "sm:col-span-2" : ""}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
        {icon}
        <span>{value}</span>
      </div>
    </div>
  );
}

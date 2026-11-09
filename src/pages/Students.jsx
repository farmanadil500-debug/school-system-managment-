import React, { useMemo, useState } from "react";
import { Plus, Search, Eye, Pencil, Trash2, Users, Filter, Phone } from "lucide-react";
import Modal from "../components/Modal";
import { Avatar, EmptyState, SectionHeader, StatusBadge } from "../components/ui";
import { CLASSES, SECTIONS } from "../data/mock";
import { createStudentAPI, deleteStudentAPI } from "../services/api";

const GENDERS = ["Male", "Female"];

const emptyForm = {
  name: "",
  rollNo: "",
  class: "Grade 1",
  section: "A",
  gender: "Male",
  parentName: "",
  phone: "",
  admissionDate: new Date().toISOString().slice(0, 10),
};

export default function Students({ students, setStudents, globalQuery, openAdd, onCloseAdd, onView }) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const effectiveQuery = (globalQuery || search || "").toLowerCase();

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

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.rollNo || isNaN(Number(form.rollNo))) e.rollNo = "Enter a valid number";
    if (!form.parentName.trim()) e.parentName = "Required";
    if (!form.phone.trim()) e.phone = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const newStudentData = {
      ...form,
      rollNo: Number(form.rollNo),
      status: "Active",
      feeStatus: "Pending",
      feeAmount: 4500,
      email: form.name.toLowerCase().replace(/\s+/g, ".") + "@apex.edu",
      address: "—",
      dob: "—",
      bloodGroup: "—",
    };

    try {
      const saved = await createStudentAPI(newStudentData);
      setStudents((prev) => [saved, ...prev]);
    } catch (err) {
      console.warn("Backend API offline or error, saving locally:", err.message);
      setStudents((prev) => [{ ...newStudentData, id: Date.now() }, ...prev]);
    }

    setForm(emptyForm);
    onCloseAdd();
  };

  const removeStudent = async (id) => {
    try {
      await deleteStudentAPI(id);
    } catch (err) {
      console.warn("Backend API offline or error, deleting locally:", err.message);
    }
    setStudents((prev) => prev.filter((s) => s.id !== id && s._id !== id));
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Students Directory"
        subtitle={`${students.length} students enrolled · Manage admissions & records`}
        action={
          <button className="btn-primary" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Student
          </button>
        }
      />

      <div className="card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={globalQuery || search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, roll no, parent…"
              className="input pl-10"
              disabled={!!globalQuery}
            />
            {globalQuery && <p className="mt-1 text-xs text-slate-400">Driven by global search</p>}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="input w-auto">
              <option>All</option>
              {CLASSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students found"
            subtitle="Try adjusting your search or filter, or add a new student to the directory."
            action={<button className="btn-primary" onClick={openAdd}><Plus className="h-4 w-4" /> Add Student</button>}
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
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} />
                        <div>
                          <p className="font-semibold text-slate-800">{s.name}</p>
                          <p className="text-xs text-slate-500">Admitted {s.admissionDate}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="font-mono text-slate-600">#{s.rollNo}</span></td>
                    <td><span className="badge bg-slate-100 text-slate-600">{s.class} · {s.section}</span></td>
                    <td className="text-slate-600">{s.parentName}</td>
                    <td><span className="text-slate-600">{s.phone}</span></td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onView(s)} className="rounded-lg p-2 text-slate-400 hover:bg-brand-50 hover:text-brand-600" title="View"><Eye className="h-4 w-4" /></button>
                        <button className="rounded-lg p-2 text-slate-400 hover:bg-sky-50 hover:text-sky-600" title="Edit"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setDeleteTarget(s)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={openAdd}
        onClose={onCloseAdd}
        title="Add New Student"
        subtitle="Register a new admission to the directory"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={onCloseAdd}>Cancel</button>
            <button className="btn-primary" onClick={submit}><Plus className="h-4 w-4" /> Add Student</button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name" error={errors.name}>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ayesha Khan" />
          </Field>
          <Field label="Roll Number" error={errors.rollNo}>
            <input className="input" value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} placeholder="e.g. 101" />
          </Field>
          <Field label="Class">
            <select className="input" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })}>
              {CLASSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Section">
            <select className="input" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
              {SECTIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Gender">
            <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              {GENDERS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Admission Date">
            <input type="date" className="input" value={form.admissionDate} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} />
          </Field>
          <Field label="Parent / Guardian Name" error={errors.parentName}>
            <input className="input" value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} placeholder="e.g. Mr. Khan" />
          </Field>
          <Field label="Phone Number" error={errors.phone}>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 3XX XXXX XXX" />
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Student"
        subtitle="This action cannot be undone"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500" onClick={() => removeStudent(deleteTarget?.id)}><Trash2 className="h-4 w-4" /> Delete</button>
          </>
        }
      >
        <div className="flex items-center gap-4">
          {deleteTarget && <Avatar name={deleteTarget.name} size="lg" />}
          <div>
            <p className="font-semibold text-slate-800">{deleteTarget?.name}</p>
            <p className="text-sm text-slate-500">Roll #{deleteTarget?.rollNo} · {deleteTarget?.class}</p>
            <p className="mt-2 text-sm text-slate-600">Are you sure you want to remove this student record?</p>
          </div>
        </div>
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
  return (
    <Modal
      open={!!student}
      onClose={onClose}
      title="Student Profile"
      subtitle={`${student.class} · Section ${student.section}`}
      size="lg"
      footer={<button className="btn-primary" onClick={onClose}>Close</button>}
    >
      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-brand-50 to-slate-50 p-5 ring-1 ring-brand-100">
        <Avatar name={student.name} size="lg" />
        <div>
          <h3 className="text-lg font-bold text-slate-900">{student.name}</h3>
          <p className="text-sm text-slate-600">Roll #{student.rollNo} · {student.gender}</p>
          <p className="mt-1 text-xs text-slate-500">Admitted on {student.admissionDate}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InfoRow label="Parent / Guardian" value={student.parentName} />
        <InfoRow label="Phone" value={student.phone} icon={<Phone className="h-4 w-4" />} />
        <InfoRow label="Email" value={student.email} />
        <InfoRow label="Address" value={student.address} />
        <InfoRow label="Date of Birth" value={student.dob} />
        <InfoRow label="Blood Group" value={student.bloodGroup} />
        <InfoRow label="Status" value={<StatusBadge status={student.status} />} />
        <InfoRow label="Fee Status" value={<span className="badge bg-amber-50 text-amber-700 ring-1 ring-amber-200">{student.feeStatus}</span>} />
      </div>
    </Modal>
  );
}

function InfoRow({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
        {icon}{value}
      </p>
    </div>
  );
}

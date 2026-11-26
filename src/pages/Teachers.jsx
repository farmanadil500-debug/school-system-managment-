import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Mail,
  Phone,
  Briefcase,
  Award,
  Plus,
  Pencil,
  UserX,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  DollarSign,
  BookOpen,
  Shield,
  UserCheck,
} from "lucide-react";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { Avatar, EmptyState, SectionHeader, StatusBadge } from "../components/ui";
import { TEACHERS } from "../data/mock";
import {
  fetchStaffAPI,
  createStaffAPI,
  updateStaffAPI,
  deleteStaffAPI,
  getStaffByIdAPI,
} from "../lib/staff-api";
import { useAuth } from "../lib/auth-context";
import { can, ROLES } from "../lib/permissions";

const STAFF_TYPES = [
  { value: "All", label: "All Staff Roles" },
  { value: "teacher", label: "Teachers" },
  { value: "accountant", label: "Accountants" },
  { value: "admin", label: "Administrators" },
  { value: "support", label: "Support Staff" },
];

const STATUS_OPTIONS = [
  { value: "All", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on_leave", label: "On Leave" },
  { value: "terminated", label: "Terminated" },
];

const TYPE_BADGE_STYLES = {
  teacher: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  accountant: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  admin: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  support: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  teacher: "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-800",
  accountant: "bg-purple-50 text-purple-700 ring-1 ring-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:ring-purple-800",
  admin: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-800",
  support: "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
};

export default function Teachers({ globalQuery }) {
  const { push } = useToast();
  const { user } = useAuth();
  const canManage = can(user, "staff:write");
  const isFinanceAdmin =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    staffType: "teacher",
    phone: "",
    email: "",
    qualification: "",
    experience: "",
    salary: "",
    joinDate: new Date().toISOString().split("T")[0],
    createLoginAccount: false,
    password: "Staff@123",
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    phone: "",
    email: "",
    qualification: "",
    experience: "",
    status: "active",
    salary: "",
  });

  // Load Staff Members from Backend API (with fallback to mock data)
  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const res = await fetchStaffAPI({
        staffType: typeFilter !== "All" ? typeFilter : undefined,
        status: statusFilter !== "All" ? statusFilter : undefined,
        q: globalQuery || search || undefined,
        limit: 100,
      });

      if (res?.data && res.data.length > 0) {
        setStaffList(res.data);
      } else if (!globalQuery && !search && typeFilter === "All" && statusFilter === "All") {
        // Fallback to mock data if server staff directory is empty
        const fallback = TEACHERS.map((t) => ({
          _id: `mock-${t.id}`,
          employeeNo: `EMP-00${t.id}`,
          name: t.name,
          staffType: "teacher",
          phone: t.phone,
          email: t.email,
          qualification: t.qualification,
          experience: t.experience,
          salary: 40000 + t.id * 3000,
          status: t.status === "Active" ? "active" : "on_leave",
          classTeacherOf: t.class ? `${t.class} - Sec A` : null,
          assignments: [{ subject: t.subject, section: "A" }],
        }));
        setStaffList(fallback);
      } else {
        setStaffList(res?.data || []);
      }
    } catch (_err) {
      // Offline fallback
      const fallback = TEACHERS.map((t) => ({
        _id: `mock-${t.id}`,
        employeeNo: `EMP-00${t.id}`,
        name: t.name,
        staffType: "teacher",
        phone: t.phone,
        email: t.email,
        qualification: t.qualification,
        experience: t.experience,
        salary: 40000 + t.id * 3000,
        status: t.status === "Active" ? "active" : "on_leave",
        classTeacherOf: t.class ? `${t.class} - Sec A` : null,
        assignments: [{ subject: t.subject, section: "A" }],
      }));
      setStaffList(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [typeFilter, statusFilter, globalQuery, search]);

  // Client-side search and filtering for instant responsiveness
  const filteredStaff = useMemo(() => {
    const q = (globalQuery || search || "").trim().toLowerCase();
    return staffList.filter((s) => {
      const matchQ =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.employeeNo?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q);

      const matchType =
        typeFilter === "All" ||
        s.staffType?.toLowerCase() === typeFilter.toLowerCase();

      const matchStatus =
        statusFilter === "All" ||
        s.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchQ && matchType && matchStatus;
    });
  }, [staffList, globalQuery, search, typeFilter, statusFilter]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      name: "",
      staffType: "teacher",
      phone: "",
      email: "",
      qualification: "",
      experience: "",
      salary: "",
      joinDate: new Date().toISOString().split("T")[0],
      createLoginAccount: false,
      password: "Staff@123",
    });
    setFormError("");
    setAddModalOpen(true);
  };

  // Submit Add Staff
  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!formData.name.trim()) {
      setFormError("Staff name is required.");
      return;
    }
    if (!formData.phone.trim()) {
      setFormError("Contact phone number is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        staffType: formData.staffType,
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        qualification: formData.qualification.trim(),
        experience: formData.experience.trim(),
        salary: formData.salary ? Number(formData.salary) : 0,
        joinDate: formData.joinDate,
        createLoginAccount: formData.createLoginAccount,
        password: formData.createLoginAccount ? formData.password : undefined,
      };

      await createStaffAPI(payload);
      push("Staff member created successfully!", "success");
      setAddModalOpen(false);
      await loadStaff();
    } catch (err) {
      setFormError(err.message || "Failed to create staff member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (staff) => {
    setEditTarget(staff);
    setEditFormData({
      name: staff.name || "",
      phone: staff.phone || "",
      email: staff.email || "",
      qualification: staff.qualification || "",
      experience: staff.experience || "",
      status: staff.status || "active",
      salary: staff.salary ?? "",
    });
    setFormError("");
  };

  // Submit Edit Staff
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;

    setIsSubmitting(true);
    setFormError("");
    try {
      const payload = {
        name: editFormData.name.trim(),
        phone: editFormData.phone.trim(),
        email: editFormData.email.trim() || "",
        qualification: editFormData.qualification.trim(),
        experience: editFormData.experience.trim(),
        status: editFormData.status,
        salary: editFormData.salary !== "" ? Number(editFormData.salary) : 0,
      };

      await updateStaffAPI(editTarget._id, payload);
      push("Staff member updated successfully!", "success");
      setEditTarget(null);
      await loadStaff();
    } catch (err) {
      setFormError(err.message || "Failed to update staff member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Deactivation
  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;

    setIsSubmitting(true);
    try {
      await deleteStaffAPI(deactivateTarget._id);
      push(`"${deactivateTarget.name}" has been deactivated.`, "success");
      setDeactivateTarget(null);
      await loadStaff();
    } catch (err) {
      push(err.message || "Failed to deactivate staff member.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // View Detailed Profile
  const handleViewProfile = async (staff) => {
    try {
      const res = await getStaffByIdAPI(staff._id);
      if (res?.data) {
        setViewTarget(res.data);
      } else {
        setViewTarget(staff);
      }
    } catch (_e) {
      setViewTarget(staff);
    }
  };

  const activeCount = staffList.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Staff & Faculty Directory"
        subtitle={`${staffList.length} staff members · Academic teachers and institutional staff`}
        action={
          <div className="flex items-center gap-3">
            <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
            <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800">
              {activeCount} Active
            </span>
            {canManage && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="btn-primary"
              >
                <Plus className="h-4 w-4" />
                <span>Add Staff Member</span>
              </button>
            )}
          </div>
        }
      />

      {/* Search and Filters Card */}
      <div className="card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={globalQuery || search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, employee #, phone, or email…"
              className="input pl-10"
              disabled={!!globalQuery}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input w-auto text-sm"
            >
              {STAFF_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Staff Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          <p className="mt-3 text-sm text-slate-500">Loading staff directory…</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Briefcase}
            title="No staff members found"
            subtitle="Try adjusting your search criteria or role filters."
            action={
              canManage && (
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="btn-secondary"
                >
                  <Plus className="h-4 w-4" />
                  Add First Staff Member
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredStaff.map((staff) => (
            <div
              key={staff._id || staff.id}
              className="card group flex flex-col justify-between p-5 transition-shadow duration-200 hover:shadow-cardhover"
            >
              <div>
                {/* Header row: Avatar, Info, Badges */}
                <div className="flex items-start gap-3.5">
                  <Avatar name={staff.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate font-bold text-slate-900">
                        {staff.name}
                      </p>
                      <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md dark:bg-slate-800 dark:text-slate-400">
                        {staff.employeeNo || "EMP-—"}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`badge capitalize ${
                          TYPE_BADGE_STYLES[staff.staffType] ||
                          TYPE_BADGE_STYLES.teacher
                        }`}
                      >
                        {staff.staffType || "Staff"}
                      </span>
                      <StatusBadge
                        status={
                          staff.status === "active"
                            ? "Active"
                            : staff.status === "on_leave"
                            ? "On Leave"
                            : "Inactive"
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Details & Assignments */}
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3.5 text-sm">
                  {staff.email && (
                    <p className="flex items-center gap-2 text-slate-600 truncate">
                      <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">{staff.email}</span>
                    </p>
                  )}
                  {staff.phone && (
                    <p className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>{staff.phone}</span>
                    </p>
                  )}
                  {(staff.qualification || staff.experience) && (
                    <p className="flex items-center gap-2 text-slate-600">
                      <Award className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>
                        {staff.qualification || "Faculty"}
                        {staff.experience ? ` · ${staff.experience}` : ""}
                      </span>
                    </p>
                  )}

                  {/* Class Teacher Badge */}
                  {staff.classTeacherOf && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200/70 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800/80">
                      <BookOpen className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Class Teacher: {staff.classTeacherOf}</span>
                    </div>
                  )}

                  {/* Teaching Subjects */}
                  {staff.assignments && staff.assignments.length > 0 && (
                    <div className="pt-1">
                      <p className="text-xs font-medium text-slate-400 mb-1">
                        Teaching Assignments:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {staff.assignments.map((asgn, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                          >
                            {asgn.subject}
                            {asgn.section ? ` (${asgn.section})` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Monthly Salary for Authorized Admins */}
                  {isFinanceAdmin && staff.salary > 0 && (
                    <p className="flex items-center gap-2 text-xs font-medium text-slate-500 pt-1">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Salary: PKR {staff.salary.toLocaleString()} / mo</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => handleViewProfile(staff)}
                  className="btn-ghost px-2.5 py-1.5 text-xs text-brand-600 hover:text-brand-700"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View Profile
                </button>

                {canManage && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(staff)}
                      className="btn-ghost p-1.5 text-slate-500 hover:text-slate-900"
                      title="Edit details"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {staff.status === "active" && (
                      <button
                        type="button"
                        onClick={() => setDeactivateTarget(staff)}
                        className="btn-ghost p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                        title="Deactivate staff member"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= MODAL: ADD STAFF MEMBER ================= */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Staff Member"
        subtitle="Create an academic teacher, accountant, or administrative profile"
        size="lg"
      >
        <form onSubmit={handleSubmitAdd} className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Full Name *</label>
              <input
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Ms. Fatima Khan"
                className="input"
              />
            </div>

            <div>
              <label className="label">Staff Role / Type *</label>
              <select
                value={formData.staffType}
                onChange={(e) =>
                  setFormData({ ...formData, staffType: e.target.value })
                }
                className="input"
              >
                <option value="teacher">Teacher (Faculty)</option>
                <option value="accountant">Accountant</option>
                <option value="admin">Administrator</option>
                <option value="support">Support Staff</option>
              </select>
            </div>

            <div>
              <label className="label">Contact Phone *</label>
              <input
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+92 300 1234567"
                className="input"
              />
            </div>

            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="teacher@apexschool.com"
                className="input"
              />
            </div>

            <div>
              <label className="label">Qualification</label>
              <input
                value={formData.qualification}
                onChange={(e) =>
                  setFormData({ ...formData, qualification: e.target.value })
                }
                placeholder="e.g. M.Sc Mathematics, B.Ed"
                className="input"
              />
            </div>

            <div>
              <label className="label">Experience</label>
              <input
                value={formData.experience}
                onChange={(e) =>
                  setFormData({ ...formData, experience: e.target.value })
                }
                placeholder="e.g. 5 years"
                className="input"
              />
            </div>

            <div>
              <label className="label">Joining Date</label>
              <input
                type="date"
                value={formData.joinDate}
                onChange={(e) =>
                  setFormData({ ...formData, joinDate: e.target.value })
                }
                className="input"
              />
            </div>

            {isFinanceAdmin && (
              <div>
                <label className="label">Monthly Salary (PKR)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.salary}
                  onChange={(e) =>
                    setFormData({ ...formData, salary: e.target.value })
                  }
                  placeholder="e.g. 45000"
                  className="input"
                />
              </div>
            )}
          </div>

          {/* Optional Portal Login Account */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={formData.createLoginAccount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    createLoginAccount: e.target.checked,
                  })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="font-semibold text-slate-800 text-sm">
                  Create School Portal Login Account
                </span>
                <p className="text-xs text-slate-500">
                  Allow this staff member to sign in to the portal using their
                  phone or email.
                </p>
              </div>
            </label>

            {formData.createLoginAccount && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label text-xs">Initial Password</label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="input text-sm"
                    placeholder="Staff@123"
                  />
                  <span className="text-[11px] text-slate-400">
                    User will be prompted to change password on first login.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>Save Staff Member</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: EDIT STAFF MEMBER ================= */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Staff Member"
        subtitle={`Update profile for ${editTarget?.name} (${editTarget?.employeeNo})`}
        size="lg"
      >
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Full Name *</label>
              <input
                required
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                className="input"
              />
            </div>

            <div>
              <label className="label">Status</label>
              <select
                value={editFormData.status}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, status: e.target.value })
                }
                className="input"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            <div>
              <label className="label">Contact Phone</label>
              <input
                value={editFormData.phone}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, phone: e.target.value })
                }
                className="input"
              />
            </div>

            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                value={editFormData.email}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, email: e.target.value })
                }
                className="input"
              />
            </div>

            <div>
              <label className="label">Qualification</label>
              <input
                value={editFormData.qualification}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    qualification: e.target.value,
                  })
                }
                className="input"
              />
            </div>

            <div>
              <label className="label">Experience</label>
              <input
                value={editFormData.experience}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    experience: e.target.value,
                  })
                }
                className="input"
              />
            </div>

            {isFinanceAdmin && (
              <div>
                <label className="label">Monthly Salary (PKR)</label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.salary}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, salary: e.target.value })
                  }
                  className="input"
                />
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setEditTarget(null)}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Updating…</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: VIEW STAFF PROFILE ================= */}
      <Modal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title="Staff Member Profile"
        subtitle={`Profile record and assignments for ${viewTarget?.name}`}
        size="md"
      >
        {viewTarget && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
              <Avatar name={viewTarget.name} size="lg" />
              <div>
                <h4 className="text-lg font-bold text-slate-900">
                  {viewTarget.name}
                </h4>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {viewTarget.employeeNo || "EMP-—"}
                  </span>
                  <span
                    className={`badge capitalize ${
                      TYPE_BADGE_STYLES[viewTarget.staffType] ||
                      TYPE_BADGE_STYLES.teacher
                    }`}
                  >
                    {viewTarget.staffType || "Staff"}
                  </span>
                  <StatusBadge
                    status={
                      viewTarget.status === "active" ? "Active" : "Inactive"
                    }
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs text-slate-400">Phone</p>
                <p className="font-semibold text-slate-800">
                  {viewTarget.phone || "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs text-slate-400">Email</p>
                <p className="font-semibold text-slate-800 truncate">
                  {viewTarget.email || "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs text-slate-400">Qualification</p>
                <p className="font-semibold text-slate-800">
                  {viewTarget.qualification || "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs text-slate-400">Experience</p>
                <p className="font-semibold text-slate-800">
                  {viewTarget.experience || "—"}
                </p>
              </div>
              {isFinanceAdmin && (
                <div className="col-span-2 rounded-xl border border-slate-100 p-3">
                  <p className="text-xs text-slate-400">Monthly Salary</p>
                  <p className="font-semibold text-emerald-700">
                    PKR {(viewTarget.salary || 0).toLocaleString()} / month
                  </p>
                </div>
              )}
            </div>

            {/* Class Teacher Assignment */}
            {viewTarget.classTeacherOf && (
              <div className="rounded-xl bg-amber-50 p-3.5 text-sm ring-1 ring-amber-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                  Class Teacher Role
                </p>
                <p className="mt-1 font-bold text-amber-900">
                  {Array.isArray(viewTarget.classTeacherOf)
                    ? viewTarget.classTeacherOf.join(", ")
                    : viewTarget.classTeacherOf}
                </p>
              </div>
            )}

            {/* Teaching Assignments */}
            {viewTarget.assignments && viewTarget.assignments.length > 0 && (
              <div className="rounded-xl border border-slate-200 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Academic Teaching Schedule
                </p>
                <div className="space-y-1.5">
                  {viewTarget.assignments.map((asgn, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-slate-800">
                        {asgn.subject || asgn.subjectId?.name}
                      </span>
                      <span className="text-slate-500">
                        Section {asgn.section || asgn.sectionId?.name || "A"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewTarget(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL: CONFIRM DEACTIVATE ================= */}
      <Modal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate Staff Member"
        subtitle={`Confirm deactivating "${deactivateTarget?.name}"`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to deactivate{" "}
            <strong className="text-slate-900">{deactivateTarget?.name}</strong>{" "}
            ({deactivateTarget?.employeeNo})?
          </p>
          <p className="text-xs text-slate-500">
            Their teaching assignments will be suspended, and their portal login
            account will be locked. You can reactivate them anytime from the
            Edit screen.
          </p>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setDeactivateTarget(null)}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeactivate}
              className="btn bg-rose-600 text-white hover:bg-rose-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deactivating…" : "Deactivate Profile"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

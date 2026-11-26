import React, { useState, useEffect, useMemo } from "react";
import {
  Bell,
  Pin,
  Plus,
  Search,
  MessageCircle,
  Calendar,
  Users,
  Eye,
  Trash2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Share2,
  Send,
  Building,
  GraduationCap,
} from "lucide-react";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { EmptyState, SectionHeader } from "../components/ui";
import { useAuth } from "../lib/auth-context";
import { ROLES, ROLE_LABELS } from "../lib/permissions";
import { apiFetch } from "../lib/api-client";
import {
  fetchNoticesAPI,
  createNoticeAPI,
  updateNoticeAPI,
  deleteNoticeAPI,
  generateFeeReminderWhatsAppUrl,
  generateNoticeWhatsAppUrl,
} from "../lib/notices-api";

const TARGET_ROLE_OPTIONS = [
  { role: ROLES.STUDENT, label: "Students" },
  { role: ROLES.PARENT, label: "Parents" },
  { role: ROLES.TEACHER, label: "Teachers" },
  { role: ROLES.ACCOUNTANT, label: "Accountants" },
];

export default function Notices() {
  const { push } = useToast();
  const { user } = useAuth();

  const isAdmin = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;
  const isTeacher = user?.role === ROLES.TEACHER;
  const canCreate = isAdmin || isTeacher;

  // List State
  const [notices, setNotices] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedClassId, setSelectedClassId] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("published");

  // Metadata
  const [classesList, setClassesList] = useState([]);

  // Modals
  const [viewNotice, setViewNotice] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isFeeReminderOpen, setIsFeeReminderOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Notice Form State
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    roles: [],
    classIds: [],
    isPinned: false,
    expiresAt: "",
    status: "published",
  });

  // Fee Reminder State
  const [reminderData, setReminderData] = useState({
    studentName: "",
    parentName: "",
    parentPhone: "",
    voucherNo: "",
    period: new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit" }).format(new Date()),
    balance: "",
    dueDate: "",
  });

  // Load Classes Metadata
  useEffect(() => {
    async function loadAcademicClasses() {
      try {
        const res = await apiFetch("/api/v1/academic/classes");
        if (res?.data) {
          setClassesList(res.data);
        }
      } catch (_err) {
        // Fallback or silent catch
      }
    }
    loadAcademicClasses();
  }, []);

  // Fetch Notices with Active Filters
  const loadNotices = async () => {
    setIsLoading(true);
    try {
      const res = await fetchNoticesAPI({
        page: meta.page,
        limit: meta.limit,
        q: searchQuery,
        role: selectedRole,
        classId: selectedClassId,
        status: isAdmin ? selectedStatus : "published",
      });
      setNotices(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      push({ type: "error", message: err.message || "Failed to load notices" });
      setNotices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, [searchQuery, selectedRole, selectedClassId, selectedStatus, meta.page]);

  // Handle Create Notice Submit
  const handleCreateNotice = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.body.trim()) {
      push({ type: "error", message: "Please provide both title and body" });
      return;
    }

    setIsSubmitting(true);
    try {
      await createNoticeAPI({
        ...formData,
        expiresAt: formData.expiresAt ? formData.expiresAt : null,
      });

      push({ type: "success", message: "Notice published successfully!" });
      setIsCreateOpen(false);
      setFormData({
        title: "",
        body: "",
        roles: [],
        classIds: [],
        isPinned: false,
        expiresAt: "",
        status: "published",
      });
      loadNotices();
    } catch (err) {
      push({ type: "error", message: err.message || "Failed to publish notice" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Notice
  const handleDeleteNotice = async (noticeId, title) => {
    if (!window.confirm(`Are you sure you want to delete notice: "${title}"?`)) return;

    try {
      await deleteNoticeAPI(noticeId);
      push({ type: "success", message: "Notice deleted" });
      loadNotices();
    } catch (err) {
      push({ type: "error", message: err.message || "Failed to delete notice" });
    }
  };

  // Toggle role in formData
  const toggleRole = (role) => {
    setFormData((prev) => {
      const exists = prev.roles.includes(role);
      const roles = exists ? prev.roles.filter((r) => r !== role) : [...prev.roles, role];
      return { ...prev, roles };
    });
  };

  // Toggle class in formData
  const toggleClass = (cId) => {
    setFormData((prev) => {
      const exists = prev.classIds.includes(cId);
      const classIds = exists ? prev.classIds.filter((id) => id !== cId) : [...prev.classIds, cId];
      return { ...prev, classIds };
    });
  };

  // Separate Pinned and Regular Notices
  const { pinnedNotices, regularNotices } = useMemo(() => {
    const pinned = [];
    const regular = [];
    notices.forEach((n) => {
      if (n.isPinned) pinned.push(n);
      else regular.push(n);
    });
    return { pinnedNotices: pinned, regularNotices: regular };
  }, [notices]);

  // Generate WhatsApp Link for current reminderData
  const previewWhatsAppUrl = useMemo(() => {
    if (!reminderData.parentPhone || !reminderData.balance) return "";
    return generateFeeReminderWhatsAppUrl({
      parentPhone: reminderData.parentPhone,
      parentName: reminderData.parentName,
      studentName: reminderData.studentName || "Student",
      voucherNo: reminderData.voucherNo || "VCH-2026-0001",
      period: reminderData.period,
      balance: parseInt(reminderData.balance, 10) || 0,
      dueDate: reminderData.dueDate,
    });
  }, [reminderData]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <SectionHeader
        title="Notice Board & Communications"
        subtitle="School-wide bulletins, grade-level announcements, and direct WhatsApp parent reminders."
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp Fee Reminder Generator Button */}
          <button
            onClick={() => setIsFeeReminderOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-xs hover:bg-emerald-100 transition active:scale-95"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            <span>Send Fee Reminder (WhatsApp)</span>
          </button>

          {canCreate && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Post New Notice</span>
            </button>
          )}
        </div>
      </SectionHeader>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Bulletins</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Bell className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{meta.total}</span>
            <span className="text-xs text-slate-500">notices on board</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pinned Priority</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Pin className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{pinnedNotices.length}</span>
            <span className="text-xs text-slate-500">highlighted notices</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Role Targeting</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-sm font-bold text-slate-900">Multicast Filtering</p>
            <p className="text-xs text-slate-500">Staff, Parents & Students</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">WhatsApp Broadcast</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <MessageCircle className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-sm font-bold text-emerald-700">1-Click Reminders</p>
            <p className="text-[11px] text-slate-500">Direct wa.me payment links</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title or topic…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 shadow-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="All">All Audience Roles</option>
              <option value={ROLES.STUDENT}>Students</option>
              <option value={ROLES.PARENT}>Parents</option>
              <option value={ROLES.TEACHER}>Teachers</option>
              <option value={ROLES.ACCOUNTANT}>Accountants</option>
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="All">All Classes / School-wide</option>
              {classesList.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter (Admins only) */}
          {isAdmin ? (
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="published">Published</option>
                <option value="draft">Drafts</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center text-xs text-slate-500 px-2">
              <span>Showing official published notices</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Notice Feed */}
      {isLoading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          <p className="mt-3 text-xs font-semibold text-slate-600">Loading notices…</p>
        </div>
      ) : notices.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notices found"
          description={
            canCreate
              ? "Post the first announcement or broadcast to staff and parents."
              : "No bulletins are currently targeted to your profile."
          }
          actionLabel={canCreate ? "Post First Notice" : undefined}
          onAction={canCreate ? () => setIsCreateOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-4">
          {/* Pinned Section */}
          {pinnedNotices.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
                <Pin className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
                <span>Pinned Announcements</span>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {pinnedNotices.map((notice) => (
                  <NoticeCard
                    key={notice._id}
                    notice={notice}
                    isAdmin={isAdmin}
                    currentUserId={user?.userId || user?._id}
                    onView={() => setViewNotice(notice)}
                    onDelete={() => handleDeleteNotice(notice._id, notice.title)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Regular Notices */}
          {regularNotices.length > 0 && (
            <div className="space-y-3">
              {pinnedNotices.length > 0 && (
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-2">
                  <span>General Notices</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {regularNotices.map((notice) => (
                  <NoticeCard
                    key={notice._id}
                    notice={notice}
                    isAdmin={isAdmin}
                    currentUserId={user?.userId || user?._id}
                    onView={() => setViewNotice(notice)}
                    onDelete={() => handleDeleteNotice(notice._id, notice.title)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Notice Full Detail View */}
      <Modal
        open={Boolean(viewNotice)}
        onClose={() => setViewNotice(null)}
        title={viewNotice?.title || "Notice Detail"}
        description={
          viewNotice?.publishedAt
            ? `Published on ${new Date(viewNotice.publishedAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })} by ${viewNotice.createdBy?.name || "Administration"}`
            : ""
        }
      >
        {viewNotice && (
          <div className="space-y-4 text-xs">
            {/* Badges / Audience info */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
              {viewNotice.isPinned && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                  <Pin className="h-3 w-3 fill-amber-500" />
                  <span>Pinned</span>
                </span>
              )}

              {viewNotice.audience?.roles?.length > 0 ? (
                viewNotice.audience.roles.map((r) => (
                  <span
                    key={r}
                    className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 capitalize"
                  >
                    {r}
                  </span>
                ))
              ) : (
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  All School
                </span>
              )}

              {viewNotice.audience?.classIds?.map((c) => (
                <span
                  key={c._id || c}
                  className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700"
                >
                  {c.name || "Class"}
                </span>
              ))}
            </div>

            {/* Notice Body */}
            <div className="max-h-[350px] overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-slate-800 text-sm leading-relaxed border border-slate-100">
              {viewNotice.body}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <a
                href={generateNoticeWhatsAppUrl({
                  title: viewNotice.title,
                  body: viewNotice.body,
                })}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                <Share2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Share via WhatsApp</span>
              </a>

              <button
                onClick={() => setViewNotice(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: Create / Post New Notice */}
      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Post New Announcement"
        description="Broadcast notices to students, parents, faculty, or targeted grade levels."
      >
        <form onSubmit={handleCreateNotice} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notice Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={200}
              placeholder="e.g. Winter Vacation Dates Announced"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notice Body <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={5}
              placeholder="Write the full announcement text here…"
              value={formData.body}
              onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Target Audience Roles */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Audience Roles (Leave unselected for Everyone)
            </label>
            <div className="flex flex-wrap gap-2">
              {TARGET_ROLE_OPTIONS.map((opt) => {
                const isSelected = formData.roles.includes(opt.role);
                return (
                  <button
                    key={opt.role}
                    type="button"
                    onClick={() => toggleRole(opt.role)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      isSelected
                        ? "bg-brand-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Grade Classes */}
          {classesList.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Specific Classes (Leave unselected for All Grades)
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 border border-slate-100 rounded-xl">
                {classesList.map((c) => {
                  const isSelected = formData.classIds.includes(c._id);
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => toggleClass(c._id)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                        isSelected
                          ? "bg-purple-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Options */}
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData((prev) => ({ ...prev, expiresAt: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="isPinned"
                checked={formData.isPinned}
                onChange={(e) => setFormData((prev) => ({ ...prev, isPinned: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="isPinned" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Pin to top of Notice Board
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Publishing…</span>
                </>
              ) : (
                <span>Publish Notice</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Direct WhatsApp Fee Reminder Generator */}
      <Modal
        open={isFeeReminderOpen}
        onClose={() => setIsFeeReminderOpen(false)}
        title="Direct WhatsApp Fee Reminder"
        description="Fulfills project-overview.md manual send requirement. Pre-formats official Pakistani WhatsApp payment reminder with click-to-chat URL."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Student Name</label>
              <input
                type="text"
                placeholder="e.g. Ali Ahmed"
                value={reminderData.studentName}
                onChange={(e) => setReminderData((prev) => ({ ...prev, studentName: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Guardian Phone (WhatsApp)</label>
              <input
                type="tel"
                placeholder="03001234567"
                value={reminderData.parentPhone}
                onChange={(e) => setReminderData((prev) => ({ ...prev, parentPhone: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Voucher No</label>
              <input
                type="text"
                placeholder="VCH-2026-0042"
                value={reminderData.voucherNo}
                onChange={(e) => setReminderData((prev) => ({ ...prev, voucherNo: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Month</label>
              <input
                type="text"
                placeholder="2026-04"
                value={reminderData.period}
                onChange={(e) => setReminderData((prev) => ({ ...prev, period: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Outstanding (PKR)</label>
              <input
                type="number"
                placeholder="12500"
                value={reminderData.balance}
                onChange={(e) => setReminderData((prev) => ({ ...prev, balance: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Live Message Bubble Preview */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1.5 flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
              <span>WhatsApp Message Preview</span>
            </p>
            <div className="rounded-lg bg-white p-3 shadow-xs text-xs text-slate-800 space-y-1 font-mono">
              <p>Assalamu Alaikum Respected Parent,</p>
              <p>This is a polite fee reminder from *Apex International School*.</p>
              <p>Student: *{reminderData.studentName || "Ali Ahmed"}*</p>
              <p>Voucher: *{reminderData.voucherNo || "VCH-2026-0042"}* ({reminderData.period})</p>
              <p>Due Amount: *Rs {parseInt(reminderData.balance || 0, 10).toLocaleString()}*</p>
              <p>Please clear the dues to avoid late fee charges.</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              onClick={() => setIsFeeReminderOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>

            {previewWhatsAppUrl ? (
              <a
                href={previewWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Launch WhatsApp Chat</span>
              </a>
            ) : (
              <button
                disabled
                className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 cursor-not-allowed"
              >
                Enter Phone & Balance First
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

/**
 * Clean Card Component for Individual Notice
 */
function NoticeCard({ notice, isAdmin, currentUserId, onView, onDelete }) {
  const publishedDate = notice.publishedAt
    ? new Date(notice.publishedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Recently";

  const authorName = notice.createdBy?.name || "Administration";
  const authorRole = notice.createdBy?.role || "Admin";
  const canDelete = isAdmin || (notice.createdBy?._id || notice.createdBy) === currentUserId;

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
        notice.isPinned
          ? "border-amber-200 bg-amber-50/20 ring-1 ring-amber-100"
          : "border-slate-200 bg-white"
      }`}
    >
      <div>
        {/* Header tags */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {notice.isPinned && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                <Pin className="h-3 w-3 fill-amber-600" />
                <span>PINNED</span>
              </span>
            )}

            {notice.audience?.roles?.length > 0 ? (
              notice.audience.roles.map((r) => (
                <span
                  key={r}
                  className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 capitalize"
                >
                  {r}
                </span>
              ))
            ) : (
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                School-wide
              </span>
            )}

            {notice.audience?.classIds?.map((c) => (
              <span
                key={c._id || c}
                className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700"
              >
                {c.name || "Class"}
              </span>
            ))}
          </div>

          <span className="text-[11px] font-medium text-slate-400 shrink-0">
            {publishedDate}
          </span>
        </div>

        {/* Title */}
        <h4
          onClick={onView}
          className="text-sm font-bold text-slate-900 group-hover:text-brand-600 cursor-pointer transition line-clamp-1"
        >
          {notice.title}
        </h4>

        {/* Snippet */}
        <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {notice.body}
        </p>
      </div>

      {/* Footer Info & Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="text-slate-500 font-medium truncate max-w-[180px]">
          By <strong className="text-slate-700">{authorName}</strong> ({authorRole})
        </span>

        <div className="flex items-center gap-1">
          <a
            href={generateNoticeWhatsAppUrl({
              title: notice.title,
              body: notice.body,
            })}
            target="_blank"
            rel="noreferrer"
            title="Share via WhatsApp"
            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition"
          >
            <Share2 className="h-4 w-4" />
          </a>

          <button
            onClick={onView}
            title="View Full Notice"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          >
            <Eye className="h-4 w-4" />
          </button>

          {canDelete && (
            <button
              onClick={onDelete}
              title="Delete notice"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

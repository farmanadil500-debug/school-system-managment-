import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Printer,
  GraduationCap,
  Users,
  ShieldCheck,
  BookOpen,
  MapPin,
  RefreshCw,
  Loader2,
  AlertCircle,
  Filter,
} from "lucide-react";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { EmptyState, SectionHeader } from "../components/ui";
import { useAuth } from "../lib/auth-context";
import { ROLES } from "../lib/permissions";
import { apiFetch } from "../lib/api-client";
import {
  fetchSectionTimetableAPI,
  fetchTeacherTimetableAPI,
  createTimetableSlotAPI,
  deleteTimetableSlotAPI,
} from "../lib/timetable-api";

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
];

const PERIOD_PRESETS = [
  { period: 1, startTime: "08:00", endTime: "08:45" },
  { period: 2, startTime: "08:45", endTime: "09:30" },
  { period: 3, startTime: "09:30", endTime: "10:15" },
  { period: 4, startTime: "10:35", endTime: "11:20" },
  { period: 5, startTime: "11:20", endTime: "12:05" },
  { period: 6, startTime: "12:05", endTime: "12:50" },
  { period: 7, startTime: "13:10", endTime: "13:50" },
  { period: 8, startTime: "13:50", endTime: "14:30" },
];

export default function Timetable() {
  const { push } = useToast();
  const { user } = useAuth();

  const isAdmin = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;
  const isTeacher = user?.role === ROLES.TEACHER;

  // Tabs: "section" | "teacher"
  const [activeTab, setActiveTab] = useState("section");

  // Filter State
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [classesList, setClassesList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [sectionsList, setSectionsList] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedDay, setSelectedDay] = useState("all");

  // Teachers State
  const [teachersList, setTeachersList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");

  // Subjects State
  const [subjectsList, setSubjectsList] = useState([]);

  // Timetable Slots Data
  const [sectionSlots, setSectionSlots] = useState([]);
  const [teacherSlots, setTeacherSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Modals
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // New Slot Form State
  const [newSlot, setNewSlot] = useState({
    day: "monday",
    period: 1,
    startTime: "08:00",
    endTime: "08:45",
    subjectId: "",
    staffId: "",
    room: "",
  });

  // 1. Initial Metadata Loading
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [yearsRes, classesRes, sectionsRes, subjectsRes, staffRes] = await Promise.allSettled([
          apiFetch("/api/v1/academic/years"),
          apiFetch("/api/v1/academic/classes"),
          apiFetch("/api/v1/academic/sections"),
          apiFetch("/api/v1/academic/subjects"),
          apiFetch("/api/v1/staff?staffType=teacher&status=active"),
        ]);

        if (yearsRes.status === "fulfilled" && yearsRes.value?.data) {
          setAcademicYears(yearsRes.value.data);
          const currentYear = yearsRes.value.data.find((y) => y.isCurrent) || yearsRes.value.data[0];
          if (currentYear) setSelectedYearId(currentYear._id);
        }

        if (classesRes.status === "fulfilled" && classesRes.value?.data) {
          setClassesList(classesRes.value.data);
          if (classesRes.value.data.length > 0) {
            setSelectedClassId(classesRes.value.data[0]._id);
          }
        }

        if (sectionsRes.status === "fulfilled" && sectionsRes.value?.data && sectionsRes.value.data.length > 0) {
          setSectionsList(sectionsRes.value.data);
        } else if (classesRes.status === "fulfilled" && classesRes.value?.data) {
          // Extract sections embedded in classes if standalone sections endpoint was empty
          const extracted = classesRes.value.data.flatMap((c) =>
            (c.sections || []).map((sec) => ({
              ...sec,
              classId: sec.classId?._id || sec.classId || c._id,
            }))
          );
          setSectionsList(extracted);
        }

        if (subjectsRes.status === "fulfilled" && subjectsRes.value?.data) {
          setSubjectsList(subjectsRes.value.data);
          if (subjectsRes.value.data.length > 0) {
            setNewSlot((prev) => ({ ...prev, subjectId: subjectsRes.value.data[0]._id }));
          }
        }

        if (staffRes.status === "fulfilled" && staffRes.value?.data) {
          setTeachersList(staffRes.value.data);
          if (staffRes.value.data.length > 0) {
            const firstTeacherId = staffRes.value.data[0]._id;
            setNewSlot((prev) => ({ ...prev, staffId: firstTeacherId }));
            if (isTeacher && user?.staffId) {
              setSelectedStaffId(user.staffId);
            } else {
              setSelectedStaffId(firstTeacherId);
            }
          }
        }
      } catch (_err) {
        push({ type: "error", message: "Failed to load academic reference data" });
      }
    }

    loadMetadata();
  }, [user, isTeacher]);

  // Filter sections by selected class
  const filteredSections = useMemo(() => {
    if (!selectedClassId) return sectionsList;
    return sectionsList.filter(
      (s) => (s.classId?._id || s.classId || "").toString() === selectedClassId.toString()
    );
  }, [sectionsList, selectedClassId]);

  // Auto-select first section when class changes
  useEffect(() => {
    if (filteredSections.length > 0) {
      if (!filteredSections.some((s) => s._id === selectedSectionId)) {
        setSelectedSectionId(filteredSections[0]._id);
      }
    } else {
      setSelectedSectionId("");
    }
  }, [filteredSections, selectedSectionId]);

  // 2. Fetch Timetable Slots
  const loadTimetable = async () => {
    if (activeTab === "section") {
      if (!selectedSectionId) {
        setSectionSlots([]);
        return;
      }
      setIsLoadingSlots(true);
      try {
        const res = await fetchSectionTimetableAPI(selectedSectionId, {
          academicYearId: selectedYearId,
          day: selectedDay,
        });
        setSectionSlots(res.data || []);
      } catch (err) {
        push({ type: "error", message: err.message || "Failed to load class timetable" });
        setSectionSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    } else if (activeTab === "teacher") {
      const targetStaffId = isTeacher && user?.staffId ? user.staffId : selectedStaffId;
      if (!targetStaffId) {
        setTeacherSlots([]);
        return;
      }
      setIsLoadingSlots(true);
      try {
        const res = await fetchTeacherTimetableAPI(targetStaffId, {
          academicYearId: selectedYearId,
          day: selectedDay,
        });
        setTeacherSlots(res.data || []);
      } catch (err) {
        push({ type: "error", message: err.message || "Failed to load teacher timetable" });
        setTeacherSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    }
  };

  useEffect(() => {
    loadTimetable();
  }, [activeTab, selectedSectionId, selectedStaffId, selectedYearId, selectedDay]);

  // Auto-fill times when period preset changes in modal
  const handlePeriodChange = (p) => {
    const periodNum = parseInt(p, 10);
    const preset = PERIOD_PRESETS.find((pr) => pr.period === periodNum);
    setNewSlot((prev) => ({
      ...prev,
      period: periodNum,
      startTime: preset ? preset.startTime : prev.startTime,
      endTime: preset ? preset.endTime : prev.endTime,
    }));
  };

  // 3. Create Timetable Slot Handler
  const handleCreateSlot = async (e) => {
    e.preventDefault();
    if (!selectedYearId || !selectedClassId || !selectedSectionId) {
      push({ type: "error", message: "Please select an academic year, class, and section" });
      return;
    }
    if (!newSlot.subjectId || !newSlot.staffId) {
      push({ type: "error", message: "Please choose a subject and teacher" });
      return;
    }

    setIsSubmitting(true);
    try {
      await createTimetableSlotAPI({
        academicYearId: selectedYearId,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        ...newSlot,
      });

      push({
        type: "success",
        message: `Period ${newSlot.period} successfully scheduled for ${newSlot.day.toUpperCase()}`,
      });
      setIsAddSlotOpen(false);
      loadTimetable();
    } catch (err) {
      push({
        type: "error",
        message: err.message || "Clash detected! Could not schedule period.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Delete Timetable Slot Handler
  const handleDeleteSlot = async (slotId, periodLabel) => {
    if (!window.confirm(`Delete ${periodLabel}?`)) return;

    try {
      await deleteTimetableSlotAPI(slotId);
      push({ type: "success", message: "Timetable period deleted" });
      loadTimetable();
    } catch (err) {
      push({ type: "error", message: err.message || "Failed to delete slot" });
    }
  };

  // Resolve current active Class & Section names
  const activeClassName = classesList.find((c) => c._id === selectedClassId)?.name || "Class";
  const activeSectionName = sectionsList.find((s) => s._id === selectedSectionId)?.name || "A";
  const activeTeacherName =
    teachersList.find((t) => t._id === (isTeacher && user?.staffId ? user.staffId : selectedStaffId))
      ?.name || "Teacher";

  // Group slots by Day
  const slotsByDay = useMemo(() => {
    const map = {};
    DAYS.forEach((d) => {
      map[d.key] = [];
    });
    const currentSlots = activeTab === "section" ? sectionSlots : teacherSlots;
    currentSlots.forEach((slot) => {
      if (map[slot.day]) {
        map[slot.day].push(slot);
      }
    });
    return map;
  }, [activeTab, sectionSlots, teacherSlots]);

  const displayedDays = useMemo(() => {
    if (selectedDay === "all") return DAYS;
    return DAYS.filter((d) => d.key === selectedDay);
  }, [selectedDay]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <SectionHeader
        title="Weekly Timetable & Schedules"
        subtitle="Manage class lesson schedules and teacher assignments with real-time clash detection."
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            disabled={activeTab === "section" ? sectionSlots.length === 0 : teacherSlots.length === 0}
            className="btn-secondary"
          >
            <Printer className="h-4 w-4" />
            <span>Print Timetable</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setIsAddSlotOpen(true)}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" />
              <span>Add Lesson Period</span>
            </button>
          )}
        </div>
      </SectionHeader>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Weekly Scheduled Lessons</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
              <Calendar className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {activeTab === "section" ? sectionSlots.length : teacherSlots.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">periods / week</span>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Viewing Target</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
              <GraduationCap className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3">
            <p className="truncate text-lg font-bold text-slate-900 dark:text-slate-100">
              {activeTab === "section"
                ? `${activeClassName} — Sec ${activeSectionName}`
                : activeTeacherName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeTab === "section" ? "Class Schedule" : "Faculty Teaching Load"}
            </p>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Operating Days</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
              <Clock className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">6 Days</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Mon — Sat</span>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Conflict Guard</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <span>Server Clash Detection Active</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Prevents overlapping rooms & teachers</p>
        </div>
      </div>

      {/* Tabs and Filters Panel */}
      <div className="card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setActiveTab("section")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                activeTab === "section"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-brand-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Section Timetable</span>
            </button>

            <button
              onClick={() => setActiveTab("teacher")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                activeTab === "teacher"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-brand-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              <span>Teacher Timetable</span>
            </button>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={loadTimetable}
            disabled={isLoadingSlots}
            className="inline-flex items-center gap-1.5 self-start lg:self-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingSlots ? "animate-spin" : ""}`} />
            <span>Reload</span>
          </button>
        </div>

        {/* Dynamic Filters depending on Tab */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {activeTab === "section" ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Grade / Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {classesList.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Class Section</label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  disabled={filteredSections.length === 0}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {filteredSections.length === 0 ? (
                    <option value="">No Sections Available</option>
                  ) : (
                    filteredSections.map((s) => (
                      <option key={s._id} value={s._id}>
                        Section {s.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Faculty Member</label>
              <select
                value={isTeacher && user?.staffId ? user.staffId : selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                disabled={isTeacher}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900"
              >
                {teachersList.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.employeeNo || "Staff"})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Day of Week</label>
            <div className="relative">
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="all">All Days (Weekly View)</option>
                {DAYS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Timetable Matrix View */}
      {isLoadingSlots ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          <p className="mt-3 text-xs font-semibold text-slate-600">Loading schedule matrix…</p>
        </div>
      ) : displayedDays.every((d) => slotsByDay[d.key].length === 0) ? (
        <EmptyState
          icon={Calendar}
          title="No lessons scheduled yet"
          description={
            isAdmin
              ? "Use the 'Add Lesson Period' button above to schedule periods and assign teachers."
              : "No timetable records have been published for this section."
          }
          actionLabel={isAdmin ? "Add First Lesson" : undefined}
          onAction={isAdmin ? () => setIsAddSlotOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-6">
          {displayedDays.map((d) => {
            const daySlots = slotsByDay[d.key];
            if (selectedDay !== "all" && daySlots.length === 0) {
              return (
                <EmptyState
                  key={d.key}
                  icon={Calendar}
                  title={`No lessons scheduled for ${d.label}`}
                  description="Choose another day or add periods using the button above."
                />
              );
            }

            return (
              <div key={d.key} className="card overflow-hidden">
                {/* Day Header Banner */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/60">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950/80 dark:text-brand-300">
                      {d.label.slice(0, 3)}
                    </span>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{d.label}</h3>
                    <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {daySlots.length} {daySlots.length === 1 ? "lesson" : "lessons"}
                    </span>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setNewSlot((prev) => ({ ...prev, day: d.key }));
                        setIsAddSlotOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Plus className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                      <span>Add Period</span>
                    </button>
                  )}
                </div>

                {/* Day Slots List / Grid */}
                {daySlots.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No periods scheduled for this day
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    <div className="hidden grid-cols-12 gap-4 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:grid">
                      <div className="col-span-2">Period & Time</div>
                      <div className="col-span-3">Subject</div>
                      <div className="col-span-3">Teacher</div>
                      <div className="col-span-2">Room / Venue</div>
                      {isAdmin && <div className="col-span-2 text-right">Actions</div>}
                    </div>

                    {daySlots.map((slot) => {
                      const subjectName = slot.subjectId?.name || "Subject";
                      const subjectCode = slot.subjectId?.code || "";
                      const teacherName = slot.staffId?.name || "Staff";
                      const employeeNo = slot.staffId?.employeeNo || "";
                      const targetClass = slot.classId?.name || "";
                      const targetSection = slot.sectionId?.name || "";

                      return (
                        <div
                          key={slot._id}
                          className="grid grid-cols-1 items-center gap-2 px-5 py-3.5 text-xs transition hover:bg-slate-50/60 sm:grid-cols-12 sm:gap-4"
                        >
                          {/* Period & Time */}
                          <div className="col-span-2 flex items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">
                              P{slot.period}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {slot.startTime} — {slot.endTime}
                              </p>
                              <span className="text-[10px] text-slate-400">Period {slot.period}</span>
                            </div>
                          </div>

                          {/* Subject */}
                          <div className="col-span-3">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-brand-600" />
                              <div>
                                <p className="font-bold text-slate-800">{subjectName}</p>
                                {subjectCode && (
                                  <span className="text-[10px] font-medium text-slate-500">{subjectCode}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Teacher or Class */}
                          <div className="col-span-3">
                            {activeTab === "section" ? (
                              <div>
                                <p className="font-semibold text-slate-800">{teacherName}</p>
                                {employeeNo && (
                                  <span className="text-[10px] text-slate-400">{employeeNo}</span>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                  {targetClass} — Sec {targetSection}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Room */}
                          <div className="col-span-2">
                            {slot.room ? (
                              <span className="inline-flex items-center gap-1 text-slate-600">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                <span>{slot.room}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Regular Classroom</span>
                            )}
                          </div>

                          {/* Admin Actions */}
                          {isAdmin && (
                            <div className="col-span-2 flex items-center justify-end">
                              <button
                                onClick={() =>
                                  handleDeleteSlot(
                                    slot._id,
                                    `Period ${slot.period} (${subjectName}) on ${d.label}`
                                  )
                                }
                                title="Delete this period"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Add Lesson Period */}
      <Modal
        open={isAddSlotOpen}
        onClose={() => setIsAddSlotOpen(false)}
        title="Schedule Lesson Period"
        description={`Add a new subject period for ${activeClassName} — Section ${activeSectionName}. Server clash detection will prevent overlapping bookings.`}
      >
        <form onSubmit={handleCreateSlot} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Day of Week</label>
              <select
                value={newSlot.day}
                onChange={(e) => setNewSlot((prev) => ({ ...prev, day: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
              >
                {DAYS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Period Number</label>
              <select
                value={newSlot.period}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
              >
                {PERIOD_PRESETS.map((p) => (
                  <option key={p.period} value={p.period}>
                    Period {p.period} ({p.startTime} - {p.endTime})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time (HH:MM)</label>
              <input
                type="text"
                required
                pattern="^([01]\d|2[0-3]):[0-5]\d$"
                placeholder="08:00"
                value={newSlot.startTime}
                onChange={(e) => setNewSlot((prev) => ({ ...prev, startTime: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Time (HH:MM)</label>
              <input
                type="text"
                required
                pattern="^([01]\d|2[0-3]):[0-5]\d$"
                placeholder="08:45"
                value={newSlot.endTime}
                onChange={(e) => setNewSlot((prev) => ({ ...prev, endTime: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
            <select
              value={newSlot.subjectId}
              onChange={(e) => setNewSlot((prev) => ({ ...prev, subjectId: e.target.value }))}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">Select subject…</option>
              {subjectsList.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Teacher</label>
            <select
              value={newSlot.staffId}
              onChange={(e) => setNewSlot((prev) => ({ ...prev, staffId: e.target.value }))}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">Select teacher…</option>
              {teachersList.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.employeeNo || "Staff"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Room / Venue (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Room 102, Science Lab, Library"
              value={newSlot.room}
              onChange={(e) => setNewSlot((prev) => ({ ...prev, room: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setIsAddSlotOpen(false)}
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
                  <span>Verifying Clash & Saving…</span>
                </>
              ) : (
                <span>Save Period</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Official Printable Weekly Timetable */}
      <Modal
        open={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Print Weekly Timetable"
        description="Formatted official timetable ready for classroom posting or staff reference."
      >
        <div className="space-y-4">
          <div
            id="printable-timetable-sheet"
            className="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm print:m-0 print:border-none print:p-0"
          >
            {/* Header */}
            <div className="border-b-2 border-slate-800 pb-3 text-center">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                APEX INTERNATIONAL SCHOOL
              </h2>
              <p className="text-xs uppercase tracking-wider text-slate-600 font-semibold">
                Official Weekly Schedule — Academic Year 2025–2026
              </p>
              <div className="mt-2 flex items-center justify-center gap-4 text-xs font-medium text-slate-700">
                <span>
                  <strong>Target:</strong>{" "}
                  {activeTab === "section"
                    ? `${activeClassName} — Section ${activeSectionName}`
                    : `Teacher: ${activeTeacherName}`}
                </span>
                <span>•</span>
                <span>
                  <strong>Printed On:</strong> {new Date().toLocaleDateString("en-GB")}
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="mt-4 space-y-4">
              {DAYS.map((d) => {
                const daySlots = slotsByDay[d.key];
                if (daySlots.length === 0) return null;

                return (
                  <div key={d.key} className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-0.5">
                      {d.label}
                    </p>
                    <div className="grid grid-cols-4 gap-2 text-[11px]">
                      {daySlots.map((s) => (
                        <div
                          key={s._id}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-2 shadow-xs"
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-indigo-700">
                            <span>P{s.period}</span>
                            <span>{s.startTime} - {s.endTime}</span>
                          </div>
                          <p className="font-bold text-slate-800 mt-1 truncate">
                            {s.subjectId?.name || "Subject"}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {activeTab === "section"
                              ? s.staffId?.name || "Staff"
                              : `${s.classId?.name} (${s.sectionId?.name})`}
                          </p>
                          {s.room && (
                            <p className="text-[9px] text-slate-400 mt-0.5">{s.room}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Signature Footer */}
            <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6 text-xs text-slate-600">
              <div>
                <p className="font-semibold">Class Coordinator / Timetable Head</p>
                <div className="mt-6 border-b border-dashed border-slate-400 w-44"></div>
              </div>
              <div className="text-right">
                <p className="font-semibold">Principal / Administrator</p>
                <div className="mt-6 border-b border-dashed border-slate-400 w-44 ml-auto"></div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              onClick={() => setIsPrintModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              <Printer className="h-4 w-4" />
              <span>Print Sheet</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

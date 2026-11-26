import { TimetableSlot } from "./timetable-slot.model.js";
import { Enrollment } from "../student/enrollment.model.js";
import { Student } from "../student/student.model.js";
import { ApiError } from "../../utils/api-error.js";
import { logAuditEvent } from "../../utils/audit.js";
import { ROLES } from "../../constants/index.js";

export class TimetableService {
  /**
   * Helper: Sort timetable slots by day of week then period number
   */
  static sortSlots(slots) {
    const dayOrder = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    return [...slots].sort((a, b) => {
      const orderDiff = (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99);
      if (orderDiff !== 0) return orderDiff;
      return a.period - b.period;
    });
  }

  /**
   * Helper: Verify user access to section timetable
   */
  static async verifySectionAccess({ schoolId, sectionId, user }) {
    if (!user) throw ApiError.unauthorized("Authentication required");

    // Super Admin, Admin, and Teachers have access
    if (
      user.role === ROLES.SUPER_ADMIN ||
      user.role === ROLES.ADMIN ||
      user.role === ROLES.TEACHER
    ) {
      return true;
    }

    // Student: Must be enrolled in this section
    if (user.role === ROLES.STUDENT) {
      if (!user.studentId) {
        throw ApiError.forbidden("No student profile linked to your account");
      }
      const enrollment = await Enrollment.findOne({
        schoolId,
        studentId: user.studentId,
        sectionId,
        outcome: "active",
      });
      if (!enrollment) {
        throw ApiError.forbidden("You can only view your own section's timetable");
      }
      return true;
    }

    // Parent: At least one linked child must be enrolled in this section
    if (user.role === ROLES.PARENT) {
      if (!user.guardianId) {
        throw ApiError.forbidden("No parent profile linked to your account");
      }
      const children = await Student.find({
        schoolId,
        guardianIds: user.guardianId,
      }).select("_id");

      const childIds = children.map((c) => c._id);
      const enrollment = await Enrollment.findOne({
        schoolId,
        studentId: { $in: childIds },
        sectionId,
        outcome: "active",
      });

      if (!enrollment) {
        throw ApiError.forbidden("You can only view your child's section timetable");
      }
      return true;
    }

    return true;
  }

  /**
   * Get section weekly timetable
   */
  static async getSectionTimetable({ schoolId, sectionId, academicYearId, day, user }) {
    await this.verifySectionAccess({ schoolId, sectionId, user });

    const filter = { schoolId, sectionId };
    if (academicYearId) filter.academicYearId = academicYearId;
    if (day) filter.day = day.toLowerCase();

    const slots = await TimetableSlot.find(filter)
      .populate("subjectId", "name code")
      .populate("staffId", "name employeeNo phone")
      .populate("classId", "name")
      .populate("sectionId", "name")
      .lean();

    return this.sortSlots(slots);
  }

  /**
   * Get teacher weekly timetable across all assigned sections
   */
  static async getTeacherTimetable({ schoolId, staffId, academicYearId, day, user }) {
    if (!user) throw ApiError.unauthorized("Authentication required");

    // Teachers can only view their own schedule
    if (user.role === ROLES.TEACHER) {
      const userStaffId = user.staffId ? user.staffId.toString() : null;
      if (userStaffId && userStaffId !== staffId.toString()) {
        throw ApiError.forbidden("Teachers can only view their own timetable");
      }
    }

    const filter = { schoolId, staffId };
    if (academicYearId) filter.academicYearId = academicYearId;
    if (day) filter.day = day.toLowerCase();

    const slots = await TimetableSlot.find(filter)
      .populate("subjectId", "name code")
      .populate("classId", "name")
      .populate("sectionId", "name")
      .lean();

    return this.sortSlots(slots);
  }

  /**
   * Create a single timetable slot with clash detection
   */
  static async createSlot({
    schoolId,
    academicYearId,
    classId,
    sectionId,
    day,
    period,
    startTime,
    endTime,
    subjectId,
    staffId,
    room,
    actorId,
    actorRole,
    ip,
  }) {
    const formattedDay = day.toLowerCase();

    // 1. Clash check: Section already booked for this period on this day
    const sectionClash = await TimetableSlot.findOne({
      schoolId,
      sectionId,
      day: formattedDay,
      period,
    }).populate("subjectId", "name");

    if (sectionClash) {
      throw ApiError.conflict(
        `Section already has a class scheduled for period ${period} on ${formattedDay} (${sectionClash.subjectId?.name || "Subject"})`
      );
    }

    // 2. Clash check: Teacher already teaching another class in this period on this day
    const teacherClash = await TimetableSlot.findOne({
      schoolId,
      staffId,
      day: formattedDay,
      period,
    })
      .populate("classId", "name")
      .populate("sectionId", "name");

    if (teacherClash) {
      throw ApiError.conflict(
        `Teacher is already scheduled to teach in ${teacherClash.classId?.name || "Class"} ${teacherClash.sectionId?.name || ""} during period ${period} on ${formattedDay}`
      );
    }

    // 3. Create Slot
    const slot = await TimetableSlot.create({
      schoolId,
      academicYearId,
      classId,
      sectionId,
      day: formattedDay,
      period,
      startTime,
      endTime,
      subjectId,
      staffId,
      room: room || "",
    });

    // 4. Audit Log
    await logAuditEvent({
      actorId,
      actorRole,
      action: "TIMETABLE_SLOT_CREATED",
      entityType: "TimetableSlot",
      entityId: slot._id,
      after: slot.toJSON(),
      ip,
    });

    return TimetableSlot.findById(slot._id)
      .populate("subjectId", "name code")
      .populate("staffId", "name employeeNo phone")
      .populate("classId", "name")
      .populate("sectionId", "name");
  }

  /**
   * Update a timetable slot with clash detection
   */
  static async updateSlot({ schoolId, slotId, updateData, actorId, actorRole, ip }) {
    const slot = await TimetableSlot.findOne({ _id: slotId, schoolId });
    if (!slot) {
      throw ApiError.notFound("Timetable slot not found");
    }

    const before = slot.toJSON();

    const targetDay = (updateData.day || slot.day).toLowerCase();
    const targetPeriod = updateData.period || slot.period;
    const targetStaff = updateData.staffId || slot.staffId;

    // Check section clash if day or period changed
    if (updateData.day || updateData.period) {
      const sectionClash = await TimetableSlot.findOne({
        _id: { $ne: slotId },
        schoolId,
        sectionId: slot.sectionId,
        day: targetDay,
        period: targetPeriod,
      });
      if (sectionClash) {
        throw ApiError.conflict(
          `Section already has a lesson scheduled for period ${targetPeriod} on ${targetDay}`
        );
      }
    }

    // Check teacher clash if day, period, or teacher changed
    if (updateData.day || updateData.period || updateData.staffId) {
      const teacherClash = await TimetableSlot.findOne({
        _id: { $ne: slotId },
        schoolId,
        staffId: targetStaff,
        day: targetDay,
        period: targetPeriod,
      })
        .populate("classId", "name")
        .populate("sectionId", "name");

      if (teacherClash) {
        throw ApiError.conflict(
          `Teacher is already scheduled to teach in ${teacherClash.classId?.name || "Class"} ${teacherClash.sectionId?.name || ""} during period ${targetPeriod} on ${targetDay}`
        );
      }
    }

    // Apply updates
    if (updateData.day) slot.day = targetDay;
    if (updateData.period !== undefined) slot.period = updateData.period;
    if (updateData.startTime) slot.startTime = updateData.startTime;
    if (updateData.endTime) slot.endTime = updateData.endTime;
    if (updateData.subjectId) slot.subjectId = updateData.subjectId;
    if (updateData.staffId) slot.staffId = updateData.staffId;
    if (updateData.room !== undefined) slot.room = updateData.room;

    await slot.save();

    await logAuditEvent({
      actorId,
      actorRole,
      action: "TIMETABLE_SLOT_UPDATED",
      entityType: "TimetableSlot",
      entityId: slot._id,
      before,
      after: slot.toJSON(),
      ip,
    });

    return TimetableSlot.findById(slot._id)
      .populate("subjectId", "name code")
      .populate("staffId", "name employeeNo phone")
      .populate("classId", "name")
      .populate("sectionId", "name");
  }

  /**
   * Bulk save / replace timetable for a section (day or entire week)
   */
  static async bulkSaveSectionTimetable({
    schoolId,
    academicYearId,
    classId,
    sectionId,
    day,
    slots,
    actorId,
    actorRole,
    ip,
  }) {
    // 1. In-payload duplicate check
    const sectionDayPeriods = new Set();
    const staffDayPeriods = new Set();

    for (const s of slots) {
      const formattedDay = s.day.toLowerCase();
      const sectionKey = `${formattedDay}-${s.period}`;
      if (sectionDayPeriods.has(sectionKey)) {
        throw ApiError.badRequest(
          `Duplicate period ${s.period} on ${formattedDay} found in submitted schedule`
        );
      }
      sectionDayPeriods.add(sectionKey);

      const staffKey = `${s.staffId}-${formattedDay}-${s.period}`;
      if (staffDayPeriods.has(staffKey)) {
        throw ApiError.badRequest(
          `Teacher assigned to multiple lessons in period ${s.period} on ${formattedDay}`
        );
      }
      staffDayPeriods.add(staffKey);
    }

    // 2. External teacher clash detection in DB against other sections
    for (const s of slots) {
      const formattedDay = s.day.toLowerCase();
      const teacherClash = await TimetableSlot.findOne({
        schoolId,
        academicYearId,
        staffId: s.staffId,
        day: formattedDay,
        period: s.period,
        sectionId: { $ne: sectionId },
      })
        .populate("classId", "name")
        .populate("sectionId", "name");

      if (teacherClash) {
        throw ApiError.conflict(
          `Teacher is already scheduled to teach in ${teacherClash.classId?.name || "Class"} ${teacherClash.sectionId?.name || ""} on ${formattedDay} during period ${s.period}`
        );
      }
    }

    // 3. Clear existing slots
    const deleteFilter = { schoolId, academicYearId, sectionId };
    if (day) deleteFilter.day = day.toLowerCase();

    await TimetableSlot.deleteMany(deleteFilter);

    // 4. Insert new slots
    const docsToInsert = slots.map((s) => ({
      schoolId,
      academicYearId,
      classId,
      sectionId,
      day: s.day.toLowerCase(),
      period: s.period,
      startTime: s.startTime,
      endTime: s.endTime,
      subjectId: s.subjectId,
      staffId: s.staffId,
      room: s.room || "",
    }));

    if (docsToInsert.length > 0) {
      await TimetableSlot.insertMany(docsToInsert);
    }

    // 5. Audit log
    await logAuditEvent({
      actorId,
      actorRole,
      action: "TIMETABLE_SECTION_BULK_SAVED",
      entityType: "TimetableSlot",
      entityId: sectionId,
      after: {
        sectionId,
        academicYearId,
        day: day || "all",
        totalSlots: docsToInsert.length,
      },
      ip,
    });

    // Return the updated full section timetable
    const updatedSlots = await TimetableSlot.find({ schoolId, academicYearId, sectionId })
      .populate("subjectId", "name code")
      .populate("staffId", "name employeeNo phone")
      .populate("classId", "name")
      .populate("sectionId", "name")
      .lean();

    return this.sortSlots(updatedSlots);
  }

  /**
   * Delete a timetable slot
   */
  static async deleteSlot({ schoolId, slotId, actorId, actorRole, ip }) {
    const slot = await TimetableSlot.findOne({ _id: slotId, schoolId });
    if (!slot) {
      throw ApiError.notFound("Timetable slot not found");
    }

    const before = slot.toJSON();
    await TimetableSlot.deleteOne({ _id: slotId });

    await logAuditEvent({
      actorId,
      actorRole,
      action: "TIMETABLE_SLOT_DELETED",
      entityType: "TimetableSlot",
      entityId: slotId,
      before,
      ip,
    });

    return { message: "Timetable slot deleted successfully" };
  }
}

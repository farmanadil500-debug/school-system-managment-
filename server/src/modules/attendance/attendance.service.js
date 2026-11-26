import { Attendance } from "./attendance.model.js";
import { School } from "../school/school.model.js";
import { AcademicYear } from "../academic/academic-year.model.js";
import { Section } from "../academic/section.model.js";
import { TeachingAssignment } from "../academic/teaching-assignment.model.js";
import { Enrollment } from "../student/enrollment.model.js";
import { Student } from "../student/student.model.js";
import { User } from "../user/user.model.js";
import { ApiError } from "../../utils/api-error.js";
import { logAuditEvent } from "../../utils/audit.js";
import { ROLES, ATTENDANCE_STATUS } from "../../constants/index.js";

export class AttendanceService {
  /**
   * Helper: Verify if a teacher is authorized for a specific section
   */
  static async verifyTeacherSectionAccess({ schoolId, sectionId, userId }) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.unauthorized("User not found");

    // Super Admin & Admin have universal section access
    if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) {
      return true;
    }

    const staffId = user.staffId || user._id;

    // 1. Check if user is the Class Teacher of this section
    const isClassTeacher = await Section.findOne({
      _id: sectionId,
      schoolId,
      classTeacherId: { $in: [staffId, user._id] },
    });

    if (isClassTeacher) return true;

    // 2. Check if user has an active Teaching Assignment for this section
    const hasAssignment = await TeachingAssignment.findOne({
      schoolId,
      sectionId,
      staffId: { $in: [staffId, user._id] },
    });

    if (hasAssignment) return true;

    throw ApiError.forbidden(
      "You are not assigned to this class section. Only assigned teachers or administrators can mark or edit attendance."
    );
  }

  /**
   * Helper: Calculate calendar day difference in school's timezone
   */
  static getDaysDifference(dateStr, timezone = "Asia/Karachi") {
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    return Math.round((Date.parse(todayStr) - Date.parse(dateStr)) / (1000 * 60 * 60 * 24));
  }

  /**
   * Mark or update attendance for an entire section in bulk
   */
  static async markSectionAttendance({
    schoolId,
    sectionId,
    date,
    academicYearId,
    records,
    actorId,
    actorRole,
    ip,
  }) {
    // 1. Verify Section
    const section = await Section.findOne({ _id: sectionId, schoolId }).populate("classId", "name");
    if (!section) {
      throw ApiError.notFound("Section not found in this school");
    }

    // 2. Verify School Settings & Edit Window
    const school = await School.findById(schoolId);
    const timezone = school?.settings?.timezone || "Asia/Karachi";
    const editDays = school?.settings?.attendanceEditDays ?? 2;
    const diffDays = this.getDaysDifference(date, timezone);

    // 3. Resolve Academic Year
    let activeYearId = academicYearId;
    if (!activeYearId) {
      const currentYear = await AcademicYear.findOne({ schoolId, isCurrent: true });
      if (!currentYear) {
        throw ApiError.badRequest(
          "No active academic session found. Please configure an academic year."
        );
      }
      activeYearId = currentYear._id;
    }

    // 4. Role & Edit Window Checks
    if (actorRole === ROLES.TEACHER) {
      if (diffDays < 0) {
        throw ApiError.badRequest("Cannot mark attendance for a future date.");
      }
      if (diffDays > editDays) {
        throw ApiError.forbidden(
          `Attendance edit window of ${editDays} days has closed for teachers. Contact an administrator to adjust past records.`
        );
      }
      // Check section assignment
      await this.verifyTeacherSectionAccess({ schoolId, sectionId, userId: actorId });
    }

    const isOverride =
      (actorRole === ROLES.SUPER_ADMIN || actorRole === ROLES.ADMIN) && diffDays > editDays;

    // 5. Bulk Upsert Attendance
    const bulkOps = records.map((rec) => ({
      updateOne: {
        filter: {
          studentId: rec.studentId,
          date,
        },
        update: {
          $set: {
            schoolId,
            academicYearId: activeYearId,
            sectionId,
            studentId: rec.studentId,
            date,
            status: rec.status,
            markedBy: actorId,
            remarks: rec.remarks ? rec.remarks.trim() : "",
          },
        },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(bulkOps);

    // 6. Audit Trail for Administrative Overrides
    if (isOverride) {
      await logAuditEvent({
        schoolId,
        actorId,
        actorRole,
        action: "ATTENDANCE_OVERRIDE",
        entityType: "Attendance",
        entityId: sectionId,
        after: {
          date,
          section: `${section.classId?.name} - ${section.name}`,
          diffDays,
          recordCount: records.length,
        },
        ip,
      });
    }

    // 7. Calculate Summary
    const total = records.length;
    const present = records.filter((r) => r.status === ATTENDANCE_STATUS.PRESENT).length;
    const absent = records.filter((r) => r.status === ATTENDANCE_STATUS.ABSENT).length;
    const late = records.filter((r) => r.status === ATTENDANCE_STATUS.LATE).length;
    const leave = records.filter((r) => r.status === ATTENDANCE_STATUS.LEAVE).length;
    const percentage = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0;

    return {
      message: isOverride
        ? "Attendance saved with administrative override."
        : "Attendance marked successfully.",
      date,
      sectionId,
      sectionName: `${section.classId?.name} - Sec ${section.name}`,
      summary: {
        total,
        present,
        absent,
        late,
        leave,
        percentage,
      },
    };
  }

  /**
   * Get attendance sheet for a section on a given date (with student roster)
   */
  static async getSectionAttendance({ schoolId, sectionId, date, user }) {
    const section = await Section.findOne({ _id: sectionId, schoolId }).populate("classId", "name");
    if (!section) throw ApiError.notFound("Section not found");

    if (user.role === ROLES.TEACHER) {
      await this.verifyTeacherSectionAccess({ schoolId, sectionId, userId: user.userId });
    }

    const school = await School.findById(schoolId);
    const timezone = school?.settings?.timezone || "Asia/Karachi";
    const editDays = school?.settings?.attendanceEditDays ?? 2;
    const diffDays = this.getDaysDifference(date, timezone);

    const canEdit =
      user.role === ROLES.SUPER_ADMIN ||
      user.role === ROLES.ADMIN ||
      (user.role === ROLES.TEACHER && diffDays >= 0 && diffDays <= editDays);

    // 1. Fetch current student roster for this section
    const currentYear = await AcademicYear.findOne({ schoolId, isCurrent: true });
    let students = [];

    if (currentYear) {
      const enrollments = await Enrollment.find({
        schoolId,
        sectionId,
        academicYearId: currentYear._id,
        status: "active",
      })
        .populate("studentId", "name admissionNo rollNo gender")
        .sort({ rollNo: 1 })
        .lean();

      students = enrollments
        .map((e) => ({
          studentId: e.studentId?._id,
          name: e.studentId?.name,
          admissionNo: e.studentId?.admissionNo,
          rollNo: e.rollNo || e.studentId?.rollNo,
          gender: e.studentId?.gender,
        }))
        .filter((s) => s.studentId);
    }

    // Fallback: If no enrollments exist yet, query students directly
    if (students.length === 0) {
      const directStudents = await Student.find({
        schoolId,
        sectionId,
        status: "active",
      })
        .sort({ rollNo: 1, name: 1 })
        .lean();

      students = directStudents.map((s) => ({
        studentId: s._id,
        name: s.name,
        admissionNo: s.admissionNo,
        rollNo: s.rollNo || 0,
        gender: s.gender,
      }));
    }

    // 2. Fetch recorded attendance for this date
    const attendanceRecords = await Attendance.find({
      schoolId,
      sectionId,
      date,
    }).lean();

    const recordMap = new Map();
    attendanceRecords.forEach((r) => {
      recordMap.set(r.studentId.toString(), r);
    });

    const merged = students.map((s) => {
      const existing = recordMap.get(s.studentId.toString());
      return {
        studentId: s.studentId,
        name: s.name,
        admissionNo: s.admissionNo,
        rollNo: s.rollNo,
        gender: s.gender,
        status: existing?.status || ATTENDANCE_STATUS.PRESENT,
        remarks: existing?.remarks || "",
        isRecorded: !!existing,
      };
    });

    const total = merged.length;
    const present = merged.filter((r) => r.status === ATTENDANCE_STATUS.PRESENT).length;
    const absent = merged.filter((r) => r.status === ATTENDANCE_STATUS.ABSENT).length;
    const late = merged.filter((r) => r.status === ATTENDANCE_STATUS.LATE).length;
    const leave = merged.filter((r) => r.status === ATTENDANCE_STATUS.LEAVE).length;
    const percentage = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0;

    return {
      section: {
        _id: section._id,
        name: section.name,
        className: section.classId?.name,
        fullName: `${section.classId?.name} - Sec ${section.name}`,
      },
      date,
      isSaved: attendanceRecords.length > 0,
      canEdit,
      diffDays,
      summary: {
        total,
        present,
        absent,
        late,
        leave,
        percentage,
      },
      records: merged,
    };
  }

  /**
   * Get attendance history across all dates for a class or section
   */
  static async getAttendanceHistory({
    schoolId,
    sectionId,
    classId,
    startDate,
    endDate,
    limit = 50,
    user,
  }) {
    const match = { schoolId };

    if (sectionId) match.sectionId = sectionId;
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = startDate;
      if (endDate) match.date.$lte = endDate;
    }

    // If teacher, restrict to sections they teach
    if (user.role === ROLES.TEACHER && !sectionId) {
      const staffId = user.staffId || user.userId;
      const [classTeacherSections, assignments] = await Promise.all([
        Section.find({ schoolId, classTeacherId: staffId }).select("_id"),
        TeachingAssignment.find({ schoolId, staffId }).select("sectionId"),
      ]);

      const allowedSectionIds = [
        ...classTeacherSections.map((s) => s._id),
        ...assignments.map((a) => a.sectionId),
      ];

      match.sectionId = { $in: allowedSectionIds };
    }

    // Group by (date, sectionId)
    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: { date: "$date", sectionId: "$sectionId" },
          total: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $eq: ["$status", ATTENDANCE_STATUS.PRESENT] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", ATTENDANCE_STATUS.ABSENT] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ["$status", ATTENDANCE_STATUS.LATE] }, 1, 0] },
          },
          leave: {
            $sum: { $cond: [{ $eq: ["$status", ATTENDANCE_STATUS.LEAVE] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "sections",
          localField: "_id.sectionId",
          foreignField: "_id",
          as: "section",
        },
      },
      { $unwind: "$section" },
      {
        $lookup: {
          from: "classes",
          localField: "section.classId",
          foreignField: "_id",
          as: "class",
        },
      },
      { $unwind: { path: "$class", preserveNullAndEmptyArrays: true } },
    ];

    if (classId) {
      pipeline.push({
        $match: { "section.classId": classId },
      });
    }

    pipeline.push(
      {
        $project: {
          _id: 0,
          date: "$_id.date",
          sectionId: "$_id.sectionId",
          sectionName: "$section.name",
          classId: "$section.classId",
          className: "$class.name",
          total: 1,
          present: 1,
          absent: 1,
          late: 1,
          leave: 1,
          percentage: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      { $add: ["$present", { $multiply: ["$late", 0.5] }] },
                      { $cond: [{ $eq: ["$total", 0] }, 1, "$total"] },
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { date: -1, className: 1, sectionName: 1 } },
      { $limit: Number(limit) }
    );

    const history = await Attendance.aggregate(pipeline);
    return history;
  }

  /**
   * Get single student attendance summary & chronological calendar log
   */
  static async getStudentAttendance({ schoolId, studentId, month, user }) {
    // RBAC: Check student access
    if (user.role === ROLES.STUDENT) {
      if (user.studentId?.toString() !== studentId.toString()) {
        throw ApiError.forbidden("You can only view your own attendance records.");
      }
    }

    if (user.role === ROLES.PARENT) {
      if (!user.guardianId) {
        throw ApiError.forbidden("No guardian record linked to your user account.");
      }
      const studentDoc = await Student.findOne({ _id: studentId, schoolId }).lean();
      if (
        !studentDoc ||
        !studentDoc.guardianIds?.some((gId) => gId.toString() === user.guardianId.toString())
      ) {
        throw ApiError.forbidden("You can only view attendance records for your own children.");
      }
    }

    const student = await Student.findOne({ _id: studentId, schoolId }).lean();
    if (!student) throw ApiError.notFound("Student not found");

    const filter = { schoolId, studentId };
    if (month) {
      filter.date = { $regex: `^${month}` };
    }

    const records = await Attendance.find(filter).sort({ date: -1 }).lean();

    const total = records.length;
    const present = records.filter((r) => r.status === ATTENDANCE_STATUS.PRESENT).length;
    const absent = records.filter((r) => r.status === ATTENDANCE_STATUS.ABSENT).length;
    const late = records.filter((r) => r.status === ATTENDANCE_STATUS.LATE).length;
    const leave = records.filter((r) => r.status === ATTENDANCE_STATUS.LEAVE).length;
    const percentage = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0;

    return {
      student: {
        _id: student._id,
        name: student.name,
        admissionNo: student.admissionNo,
      },
      month: month || "all",
      summary: {
        total,
        present,
        absent,
        late,
        leave,
        percentage,
      },
      records: records.map((r) => ({
        date: r.date,
        status: r.status,
        remarks: r.remarks,
      })),
    };
  }

  /**
   * Get low attendance student report (below threshold, e.g. < 75%)
   */
  static async getLowAttendanceList({ schoolId, sectionId, threshold = 75 }) {
    const match = { schoolId };
    if (sectionId) match.sectionId = sectionId;

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: "$studentId",
          total: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $eq: ["$status", ATTENDANCE_STATUS.PRESENT] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", ATTENDANCE_STATUS.ABSENT] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ["$status", ATTENDANCE_STATUS.LATE] }, 1, 0] },
          },
          leave: {
            $sum: { $cond: [{ $eq: ["$status", ATTENDANCE_STATUS.LEAVE] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          studentId: "$_id",
          total: 1,
          present: 1,
          absent: 1,
          late: 1,
          leave: 1,
          percentage: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      { $add: ["$present", { $multiply: ["$late", 0.5] }] },
                      { $cond: [{ $eq: ["$total", 0] }, 1, "$total"] },
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $match: {
          total: { $gte: 5 }, // At least 5 days of school marked
          percentage: { $lt: Number(threshold) },
        },
      },
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      {
        $lookup: {
          from: "guardians",
          localField: "student.guardianId",
          foreignField: "_id",
          as: "guardian",
        },
      },
      { $unwind: { path: "$guardian", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          studentId: 1,
          name: "$student.name",
          admissionNo: "$student.admissionNo",
          phone: "$student.emergencyContactPhone",
          guardianName: "$guardian.name",
          guardianPhone: "$guardian.phone",
          total: 1,
          present: 1,
          absent: 1,
          late: 1,
          leave: 1,
          percentage: 1,
        },
      },
      { $sort: { percentage: 1 } },
    ];

    const lowAttendance = await Attendance.aggregate(pipeline);
    return lowAttendance;
  }
}

import { Student } from "../student/student.model.js";
import { Enrollment } from "../student/enrollment.model.js";
import { Attendance } from "../attendance/attendance.model.js";
import { FeeVoucher } from "../fee/fee-voucher.model.js";
import { FeePayment } from "../fee/fee-payment.model.js";
import { TimetableSlot } from "../timetable/timetable-slot.model.js";
import { Exam } from "../exam/exam.model.js";
import { ExamService } from "../exam/exam.service.js";
import { Notice } from "../notice/notice.model.js";
import { ApiError } from "../../utils/api-error.js";
import { ROLES, ATTENDANCE_STATUS } from "../../constants/index.js";

export class PortalService {
  /**
   * Verify that the acting user (Student or Parent) has permission to access the target student record.
   * Admins and Super Admins bypass ownership.
   */
  static async verifyStudentOwnership({ user, studentId, schoolId }) {
    if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) {
      const student = await Student.findOne({ _id: studentId, schoolId }).lean();
      if (!student) throw ApiError.notFound("Student record not found");
      return student;
    }

    const student = await Student.findOne({ _id: studentId, schoolId }).lean();
    if (!student) {
      throw ApiError.notFound("Student record not found");
    }

    if (user.role === ROLES.STUDENT) {
      const myStudentId = user.studentId || user._id;
      if (myStudentId?.toString() !== studentId.toString()) {
        throw ApiError.forbidden("Access denied: You can only view your own student records.");
      }
      return student;
    }

    if (user.role === ROLES.PARENT) {
      if (!user.guardianId) {
        throw ApiError.forbidden(
          "Access denied: No guardian record is linked to your user account."
        );
      }

      const isChild = student.guardianIds?.some(
        (gId) => gId.toString() === user.guardianId.toString()
      );

      if (!isChild) {
        throw ApiError.forbidden(
          "Access denied: You do not have permission to view records for this student."
        );
      }

      return student;
    }

    throw ApiError.forbidden("Access denied: Unauthorized role for portal operations.");
  }

  /**
   * List all children linked to a parent user, or the current student for student logins.
   */
  static async getMyChildren({ user, schoolId }) {
    if (user.role === ROLES.PARENT) {
      if (!user.guardianId) return [];

      const children = await Student.find({
        schoolId,
        guardianIds: user.guardianId,
        status: { $ne: "withdrawn" },
      })
        .sort({ admissionNo: 1 })
        .lean();

      // Populate current active enrollment and section class teacher for each child
      const childrenWithEnrollments = await Promise.all(
        children.map(async (child) => {
          const enrollment = await Enrollment.findOne({
            studentId: child._id,
            schoolId,
            outcome: "active",
          })
            .populate("classId", "name")
            .populate({
              path: "sectionId",
              select: "name classTeacherId",
              populate: { path: "classTeacherId", select: "name phone email" },
            })
            .populate("academicYearId", "name isCurrent")
            .lean();

          return {
            _id: child._id,
            admissionNo: child.admissionNo,
            name: child.name,
            dob: child.dob,
            gender: child.gender,
            bloodGroup: child.bloodGroup,
            status: child.status,
            photoUrl: child.photoUrl,
            enrollment: enrollment
              ? {
                  enrollmentId: enrollment._id,
                  rollNo: enrollment.rollNo,
                  classId: enrollment.classId?._id,
                  className: enrollment.classId?.name,
                  sectionId: enrollment.sectionId?._id,
                  sectionName: enrollment.sectionId?.name,
                  classTeacher: enrollment.sectionId?.classTeacherId?.name || "Unassigned",
                  academicYear: enrollment.academicYearId?.name,
                }
              : null,
          };
        })
      );

      return childrenWithEnrollments;
    }

    if (user.role === ROLES.STUDENT) {
      const myStudentId = user.studentId || user._id;
      const student = await Student.findOne({ _id: myStudentId, schoolId }).lean();
      if (!student) return [];

      const enrollment = await Enrollment.findOne({
        studentId: student._id,
        schoolId,
        outcome: "active",
      })
        .populate("classId", "name")
        .populate({
          path: "sectionId",
          select: "name classTeacherId",
          populate: { path: "classTeacherId", select: "name phone email" },
        })
        .populate("academicYearId", "name isCurrent")
        .lean();

      return [
        {
          _id: student._id,
          admissionNo: student.admissionNo,
          name: student.name,
          dob: student.dob,
          gender: student.gender,
          bloodGroup: student.bloodGroup,
          status: student.status,
          photoUrl: student.photoUrl,
          enrollment: enrollment
            ? {
                enrollmentId: enrollment._id,
                rollNo: enrollment.rollNo,
                classId: enrollment.classId?._id,
                className: enrollment.classId?.name,
                sectionId: enrollment.sectionId?._id,
                sectionName: enrollment.sectionId?.name,
                classTeacher: enrollment.sectionId?.classTeacherId?.name || "Unassigned",
                academicYear: enrollment.academicYearId?.name,
              }
            : null,
        },
      ];
    }

    return [];
  }

  /**
   * Get comprehensive profile for a student (with guardian contacts & active class/section)
   */
  static async getStudentProfile({ user, studentId, schoolId }) {
    await this.verifyStudentOwnership({ user, studentId, schoolId });

    const student = await Student.findOne({ _id: studentId, schoolId })
      .populate("guardianIds", "name relation phone email occupation")
      .lean();

    if (!student) throw ApiError.notFound("Student not found");

    const enrollment = await Enrollment.findOne({
      studentId: student._id,
      schoolId,
      outcome: "active",
    })
      .populate("classId", "name")
      .populate({
        path: "sectionId",
        select: "name classTeacherId",
        populate: { path: "classTeacherId", select: "name phone email" },
      })
      .populate("academicYearId", "name isCurrent")
      .lean();

    return {
      student: {
        _id: student._id,
        admissionNo: student.admissionNo,
        name: student.name,
        dob: student.dob,
        gender: student.gender,
        bloodGroup: student.bloodGroup,
        emergencyPhone: student.emergencyPhone,
        address: student.address,
        admissionDate: student.admissionDate,
        status: student.status,
        guardians: student.guardianIds || [],
      },
      enrollment: enrollment
        ? {
            enrollmentId: enrollment._id,
            rollNo: enrollment.rollNo,
            classId: enrollment.classId?._id,
            className: enrollment.classId?.name,
            sectionId: enrollment.sectionId?._id,
            sectionName: enrollment.sectionId?.name,
            classTeacher: enrollment.sectionId?.classTeacherId?.name || "Unassigned",
            classTeacherPhone: enrollment.sectionId?.classTeacherId?.phone || "",
            academicYear: enrollment.academicYearId?.name,
          }
        : null,
    };
  }

  /**
   * Get student attendance calendar logs and statistics
   */
  static async getStudentAttendance({ user, studentId, schoolId, month }) {
    await this.verifyStudentOwnership({ user, studentId, schoolId });

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
      month: month || "all",
      summary: {
        totalDays: total,
        presentDays: present,
        absentDays: absent,
        lateDays: late,
        leaveDays: leave,
        attendanceRate: `${percentage}%`,
        percentage,
        isAtRisk: percentage < 75 && total >= 5,
      },
      records: records.map((r) => ({
        date: r.date,
        status: r.status,
        remarks: r.remarks,
      })),
    };
  }

  /**
   * Get student fee invoices, vouchers, and payment receipts
   */
  static async getStudentFees({ user, studentId, schoolId, status, period }) {
    await this.verifyStudentOwnership({ user, studentId, schoolId });

    const filter = { schoolId, studentId };
    if (status) filter.status = status;
    if (period) filter.period = period;

    const vouchers = await FeeVoucher.find(filter)
      .sort({ period: -1 })
      .populate("academicYearId", "name")
      .lean();

    // Populate payment receipts for each voucher
    const vouchersWithPayments = await Promise.all(
      vouchers.map(async (v) => {
        const payments = await FeePayment.find({
          voucherId: v._id,
          status: "posted",
        })
          .sort({ receivedAt: -1 })
          .lean();

        return {
          _id: v._id,
          voucherNo: v.voucherNo,
          period: v.period,
          academicYear: v.academicYearId?.name,
          items: v.items || [],
          subtotal: v.subtotal,
          discount: v.discount,
          fine: v.fine,
          total: v.total,
          paidAmount: v.paidAmount,
          balance: v.balance,
          dueDate: v.dueDate,
          status: v.status,
          payments: payments.map((p) => ({
            receiptNo: p.receiptNo,
            amount: p.amount,
            method: p.method,
            reference: p.reference,
            receivedAt: p.receivedAt,
          })),
        };
      })
    );

    // Totals overview
    let totalDues = 0;
    let totalPaid = 0;
    let totalPending = 0;

    vouchers.forEach((v) => {
      totalDues += v.total || 0;
      totalPaid += v.paidAmount || 0;
      totalPending += v.balance || 0;
    });

    return {
      overview: {
        totalVouchers: vouchers.length,
        totalDues,
        totalPaid,
        totalPending,
        hasOutstanding: totalPending > 0,
      },
      vouchers: vouchersWithPayments,
    };
  }

  /**
   * Get student's weekly timetable for their enrolled section
   */
  static async getStudentTimetable({ user, studentId, schoolId }) {
    await this.verifyStudentOwnership({ user, studentId, schoolId });

    const enrollment = await Enrollment.findOne({
      studentId,
      schoolId,
      outcome: "active",
    })
      .populate("classId", "name")
      .populate("sectionId", "name")
      .lean();

    if (!enrollment || !enrollment.sectionId) {
      return {
        section: null,
        schedule: {},
      };
    }

    const slots = await TimetableSlot.find({
      schoolId,
      sectionId: enrollment.sectionId._id,
    })
      .populate("subjectId", "name code")
      .populate("staffId", "name phone email")
      .sort({ day: 1, period: 1 })
      .lean();

    // Group slots by day
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const schedule = {};
    days.forEach((d) => {
      schedule[d] = [];
    });

    slots.forEach((s) => {
      if (schedule[s.day]) {
        schedule[s.day].push({
          period: s.period,
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room,
          subject: s.subjectId?.name || "Subject",
          subjectCode: s.subjectId?.code || "",
          teacher: s.staffId?.name || "Unassigned",
        });
      }
    });

    return {
      section: {
        _id: enrollment.sectionId._id,
        name: enrollment.sectionId.name,
        className: enrollment.classId?.name,
      },
      schedule,
    };
  }

  /**
   * Get published exams and official report cards for this student
   */
  static async getStudentExams({ user, studentId, schoolId }) {
    await this.verifyStudentOwnership({ user, studentId, schoolId });

    // Only published exams can be seen by parent or student
    const publishedExams = await Exam.find({
      schoolId,
      status: "published",
    })
      .sort({ startDate: -1 })
      .lean();

    const reportCards = [];
    for (const exam of publishedExams) {
      try {
        const reportCard = await ExamService.getStudentReportCard({
          examId: exam._id,
          schoolId,
          studentId,
          user,
        });
        reportCards.push(reportCard);
      } catch {
        // If student was not enrolled in this exam's class or subjects, omit silently
      }
    }

    return reportCards;
  }

  /**
   * Get notices targeted to the student's class, section, or roles (parent/student)
   */
  static async getStudentNotices({ user, studentId, schoolId }) {
    await this.verifyStudentOwnership({ user, studentId, schoolId });

    const enrollment = await Enrollment.findOne({
      studentId,
      schoolId,
      outcome: "active",
    }).lean();

    const targetRoles = [user.role];
    if (user.role === ROLES.PARENT) {
      targetRoles.push(ROLES.STUDENT);
    }

    const orClauses = [
      { "audience.roles": { $in: targetRoles } },
      { "audience.roles": { $size: 0 } }, // General school-wide notices
    ];

    if (enrollment) {
      if (enrollment.classId) {
        orClauses.push({ "audience.classIds": enrollment.classId });
      }
      if (enrollment.sectionId) {
        orClauses.push({ "audience.sectionIds": enrollment.sectionId });
      }
    }

    const notices = await Notice.find({
      schoolId,
      status: "published",
      $or: orClauses,
    })
      .sort({ isPinned: -1, publishedAt: -1 })
      .limit(30)
      .lean();

    return notices.map((n) => ({
      _id: n._id,
      title: n.title,
      body: n.body,
      isPinned: n.isPinned,
      publishedAt: n.publishedAt,
      expiresAt: n.expiresAt,
      attachmentUrl: n.attachmentUrl,
    }));
  }
}

import mongoose from "mongoose";
import { Student } from "../student/student.model.js";
import { Enrollment } from "../student/enrollment.model.js";
import { Staff } from "../staff/staff.model.js";
import { Attendance } from "../attendance/attendance.model.js";
import { FeeVoucher } from "../fee/fee-voucher.model.js";
import { FeePayment } from "../fee/fee-payment.model.js";
import { Exam } from "../exam/exam.model.js";
import { ExamSubject } from "../exam/exam-subject.model.js";
import { Mark } from "../exam/mark.model.js";
import { Section } from "../academic/section.model.js";
import { TeachingAssignment } from "../academic/teaching-assignment.model.js";
import { TimetableSlot } from "../timetable/timetable-slot.model.js";
import { AuditLog } from "../audit/audit-log.model.js";
import { ApiError } from "../../utils/api-error.js";
import { ROLES } from "../../constants/index.js";

export class ReportService {
  /**
   * Helper: Verify teacher ownership of a section
   */
  static async verifyTeacherSectionAccess({ schoolId, sectionId, user }) {
    if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) {
      return true;
    }

    if (user.role !== ROLES.TEACHER) {
      throw ApiError.forbidden("You do not have access to academic reports");
    }

    const teacherStaffId = user.staffId || user._id;

    const isClassTeacher = await Section.findOne({
      _id: sectionId,
      schoolId,
      classTeacherId: { $in: [teacherStaffId, user._id] },
    });
    if (isClassTeacher) return true;

    const isSubjectTeacher = await TeachingAssignment.findOne({
      schoolId,
      sectionId,
      staffId: { $in: [teacherStaffId, user._id] },
    });
    if (isSubjectTeacher) return true;

    throw ApiError.forbidden("Teachers can only access reports for their assigned class sections.");
  }

  /**
   * 1. Dynamic Role-Aware Dashboard Aggregates
   */
  static async getDashboardStats({ schoolId, user }) {
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const currentPeriod = todayStr.slice(0, 7); // "YYYY-MM"

    // --- Admin / Super Admin Dashboard ---
    if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) {
      const [
        totalStudents,
        totalStaff,
        todayAttendanceDocs,
        currentPeriodVouchers,
        recentActivityDocs,
      ] = await Promise.all([
        Enrollment.countDocuments({ schoolId, outcome: "active" }),
        Staff.countDocuments({ schoolId, status: "active" }),
        Attendance.find({ schoolId, date: todayStr }).lean(),
        FeeVoucher.find({ schoolId, period: currentPeriod }).lean(),
        AuditLog.find({ schoolId })
          .sort({ at: -1 })
          .limit(8)
          .populate("actorId", "name role")
          .lean(),
      ]);

      // Calculate Today's Attendance Rate
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let leaveCount = 0;

      todayAttendanceDocs.forEach((a) => {
        if (a.status === "Present") presentCount++;
        else if (a.status === "Absent") absentCount++;
        else if (a.status === "Late") lateCount++;
        else if (a.status === "Leave") leaveCount++;
      });

      const totalMarked = todayAttendanceDocs.length;
      const attendanceRate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

      // Calculate Fee Collections for Current Month
      let totalBilled = 0;
      let totalCollected = 0;
      let totalPending = 0;

      currentPeriodVouchers.forEach((v) => {
        totalBilled += v.total || 0;
        totalCollected += v.paidAmount || 0;
        totalPending += v.balance || 0;
      });

      // Calculate 6-month historical fee collection trend
      const monthlyCollections = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const monthLabel = d.toLocaleString("en-US", { month: "short" });

        // Sum vouchers for period p
        const pVouchers = await FeeVoucher.find({ schoolId, period: p })
          .select("paidAmount total")
          .lean();
        const col = pVouchers.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
        monthlyCollections.push({
          period: p,
          month: monthLabel,
          amount: col,
        });
      }

      // Shape Activity feed
      const recentActivity = recentActivityDocs.map((act) => ({
        id: act._id,
        title: act.action.replace(/_/g, " "),
        detail: `Entity: ${act.entityType} by ${act.actorId?.name || "System"}`,
        time: act.at ? new Date(act.at).toLocaleDateString("en-GB") : "Recently",
        type: act.entityType?.toLowerCase() || "activity",
      }));

      return {
        role: user.role,
        overview: {
          totalStudents: totalStudents || 0,
          totalStaff: totalStaff || 0,
          todayAttendanceRate: `${attendanceRate}%`,
          todayPresentCount: presentCount,
          todayAbsentCount: absentCount,
          todayLateCount: lateCount,
          todayLeaveCount: leaveCount,
          todayTotalMarked: totalMarked,
          monthlyFeeCollected: totalCollected,
          monthlyFeePending: totalPending,
          monthlyFeeBilled: totalBilled,
          currentPeriod,
        },
        monthlyCollections,
        recentActivity,
      };
    }

    // --- Teacher Dashboard ---
    if (user.role === ROLES.TEACHER) {
      const teacherStaffId = user.staffId || user._id;

      // Resolve Teacher Sections
      const classTeacherSections = await Section.find({
        schoolId,
        classTeacherId: { $in: [teacherStaffId, user._id] },
      }).select("_id name");

      const teachingAssignments = await TeachingAssignment.find({
        schoolId,
        staffId: { $in: [teacherStaffId, user._id] },
      })
        .populate("sectionId", "name")
        .populate("subjectId", "name");

      const sectionIdSet = new Set();
      classTeacherSections.forEach((s) => sectionIdSet.add(s._id.toString()));
      teachingAssignments.forEach((ta) => {
        if (ta.sectionId) sectionIdSet.add(ta.sectionId._id.toString());
      });

      const assignedSectionIds = Array.from(sectionIdSet).map(
        (id) => new mongoose.Types.ObjectId(id)
      );

      const totalStudents = await Enrollment.countDocuments({
        schoolId,
        sectionId: { $in: assignedSectionIds },
        outcome: "active",
      });

      // Today's day of week
      const dayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday ...
      const dayNames = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const todayDay = dayNames[dayIndex];

      const todaySchedule = await TimetableSlot.find({
        schoolId,
        staffId: { $in: [teacherStaffId, user._id] },
        day: todayDay,
      })
        .populate("subjectId", "name code")
        .populate("classId", "name")
        .populate("sectionId", "name")
        .sort({ period: 1 })
        .lean();

      return {
        role: ROLES.TEACHER,
        overview: {
          mySectionsCount: assignedSectionIds.length,
          myStudentsCount: totalStudents,
          scheduledLessonsToday: todaySchedule.length,
          todayDay: todayDay.toUpperCase(),
        },
        todaySchedule,
      };
    }

    // --- Accountant Dashboard ---
    if (user.role === ROLES.ACCOUNTANT) {
      const vouchers = await FeeVoucher.find({ schoolId, period: currentPeriod }).lean();

      let totalBilled = 0;
      let totalCollected = 0;
      let totalPending = 0;
      let defaultersCount = 0;

      vouchers.forEach((v) => {
        totalBilled += v.total || 0;
        totalCollected += v.paidAmount || 0;
        totalPending += v.balance || 0;
        if (v.balance > 0 && v.dueDate && v.dueDate < todayStr) {
          defaultersCount++;
        }
      });

      const recentPayments = await FeePayment.find({ schoolId, status: "posted" })
        .sort({ receivedAt: -1 })
        .limit(8)
        .populate("studentId", "name admissionNo")
        .lean();

      return {
        role: ROLES.ACCOUNTANT,
        overview: {
          currentPeriod,
          totalVouchers: vouchers.length,
          totalBilled,
          totalCollected,
          totalPending,
          defaultersCount,
          collectionRate:
            totalBilled > 0 ? `${Math.round((totalCollected / totalBilled) * 100)}%` : "0%",
        },
        recentPayments,
      };
    }

    // --- Parent Dashboard ---
    if (user.role === ROLES.PARENT) {
      const children = user.guardianId
        ? await Student.find({ schoolId, guardianIds: user.guardianId, status: "active" })
            .select("name admissionNo photoUrl")
            .lean()
        : [];

      return {
        role: ROLES.PARENT,
        overview: {
          childrenCount: children.length,
          welcomeMessage: "Welcome to Parent Portal",
        },
        children,
      };
    }

    // --- Student Dashboard ---
    if (user.role === ROLES.STUDENT) {
      const studentId = user.studentId || user._id;
      const student = await Student.findOne({ _id: studentId, schoolId })
        .select("name admissionNo photoUrl")
        .lean();

      return {
        role: ROLES.STUDENT,
        overview: {
          studentName: student?.name || "Student",
          admissionNo: student?.admissionNo || "",
          welcomeMessage: "Welcome to Student Portal",
        },
        student,
      };
    }

    // Fallback
    return {
      role: user.role,
      message: "Welcome to Apex International School Portal.",
    };
  }

  /**
   * 2. Comprehensive Attendance Report
   */
  static async getAttendanceReport({
    schoolId,
    academicYearId,
    classId,
    sectionId,
    startDate,
    endDate,
    user,
  }) {
    if (sectionId) {
      await this.verifyTeacherSectionAccess({ schoolId, sectionId, user });
    }

    const enrollmentFilter = { schoolId, outcome: "active" };
    if (academicYearId) enrollmentFilter.academicYearId = academicYearId;
    if (classId) enrollmentFilter.classId = classId;
    if (sectionId) enrollmentFilter.sectionId = sectionId;

    const enrollments = await Enrollment.find(enrollmentFilter)
      .populate("studentId", "admissionNo name gender")
      .populate("classId", "name")
      .populate("sectionId", "name")
      .lean();

    const studentIds = enrollments.map((e) => e.studentId?._id).filter(Boolean);

    // Query Attendance records
    const attendanceFilter = {
      schoolId,
      studentId: { $in: studentIds },
    };
    if (startDate || endDate) {
      attendanceFilter.date = {};
      if (startDate) attendanceFilter.date.$gte = startDate;
      if (endDate) attendanceFilter.date.$lte = endDate;
    }

    const attendanceRecords = await Attendance.find(attendanceFilter).lean();

    // Map student counts
    const countsMap = new Map();
    attendanceRecords.forEach((a) => {
      const sId = a.studentId.toString();
      if (!countsMap.has(sId)) {
        countsMap.set(sId, { present: 0, absent: 0, late: 0, leave: 0, total: 0 });
      }
      const entry = countsMap.get(sId);
      entry.total++;
      if (a.status === "Present") entry.present++;
      else if (a.status === "Absent") entry.absent++;
      else if (a.status === "Late") entry.late++;
      else if (a.status === "Leave") entry.leave++;
    });

    let overallTotalSessions = 0;
    let overallPresent = 0;
    let atRiskCount = 0;

    const studentStats = enrollments.map((e) => {
      const sId = e.studentId?._id?.toString() || "";
      const stats = countsMap.get(sId) || { present: 0, absent: 0, late: 0, leave: 0, total: 0 };
      const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 100;

      if (percentage < 75) atRiskCount++;
      overallTotalSessions += stats.total;
      overallPresent += stats.present;

      return {
        studentId: e.studentId?._id,
        admissionNo: e.studentId?.admissionNo || "—",
        name: e.studentId?.name || "Student",
        className: e.classId?.name || "—",
        sectionName: e.sectionId?.name || "—",
        rollNo: e.rollNo || "—",
        totalSessions: stats.total,
        present: stats.present,
        absent: stats.absent,
        late: stats.late,
        leave: stats.leave,
        percentage,
        isAtRisk: percentage < 75,
      };
    });

    const averageRate =
      overallTotalSessions > 0 ? Math.round((overallPresent / overallTotalSessions) * 100) : 100;

    return {
      summary: {
        totalStudents: enrollments.length,
        averageAttendanceRate: averageRate,
        atRiskCount,
      },
      records: studentStats,
    };
  }

  /**
   * 3. Export Attendance Report as CSV
   */
  static async exportAttendanceReportCSV(params) {
    const report = await this.getAttendanceReport(params);

    const headers = [
      "Admission No",
      "Student Name",
      "Class",
      "Section",
      "Roll No",
      "Total Sessions",
      "Present",
      "Absent",
      "Late",
      "Leave",
      "Attendance %",
      "Status",
    ];

    const rows = report.records.map((r) => [
      r.admissionNo,
      `"${r.name.replace(/"/g, '""')}"`,
      r.className,
      r.sectionName,
      r.rollNo,
      r.totalSessions,
      r.present,
      r.absent,
      r.late,
      r.leave,
      `${r.percentage}%`,
      r.isAtRisk ? "At Risk (<75%)" : "Good",
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  /**
   * 4. Comprehensive Fee Collection & Revenue Report
   */
  static async getFeeReport({ schoolId, academicYearId, classId, period, status, user: _user }) {
    const filter = { schoolId };
    if (academicYearId) filter.academicYearId = academicYearId;
    if (period) filter.period = period;
    if (status) filter.status = status;

    if (classId) {
      const matchingEnrollments = await Enrollment.find({ schoolId, classId }).select("_id");
      filter.enrollmentId = { $in: matchingEnrollments.map((e) => e._id) };
    }

    const vouchers = await FeeVoucher.find(filter)
      .populate("studentId", "admissionNo name")
      .populate({
        path: "enrollmentId",
        populate: { path: "classId sectionId", select: "name" },
      })
      .lean();

    let totalBilled = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let totalDiscount = 0;
    let totalFine = 0;

    const voucherRecords = vouchers.map((v) => {
      totalBilled += v.total || 0;
      totalCollected += v.paidAmount || 0;
      totalPending += v.balance || 0;
      totalDiscount += v.discount || 0;
      totalFine += v.fine || 0;

      return {
        id: v._id,
        voucherNo: v.voucherNo,
        period: v.period,
        admissionNo: v.studentId?.admissionNo || "—",
        studentName: v.studentId?.name || "Student",
        className: v.enrollmentId?.classId?.name || "—",
        sectionName: v.enrollmentId?.sectionId?.name || "—",
        total: v.total,
        paidAmount: v.paidAmount,
        balance: v.balance,
        status: v.status,
        dueDate: v.dueDate || "—",
      };
    });

    const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

    return {
      summary: {
        totalVouchers: vouchers.length,
        totalBilled,
        totalCollected,
        totalPending,
        totalDiscount,
        totalFine,
        collectionRate,
      },
      records: voucherRecords,
    };
  }

  /**
   * 5. Export Fee Report as CSV
   */
  static async exportFeeReportCSV(params) {
    const report = await this.getFeeReport(params);

    const headers = [
      "Voucher No",
      "Period",
      "Admission No",
      "Student Name",
      "Class",
      "Section",
      "Billed Amount (PKR)",
      "Paid Amount (PKR)",
      "Remaining Balance (PKR)",
      "Status",
      "Due Date",
    ];

    const rows = report.records.map((r) => [
      r.voucherNo,
      r.period,
      r.admissionNo,
      `"${r.studentName.replace(/"/g, '""')}"`,
      r.className,
      r.sectionName,
      r.total,
      r.paidAmount,
      r.balance,
      r.status,
      r.dueDate,
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  /**
   * 6. Academic Results & Exam Analytics Report
   */
  static async getExamReport({ schoolId, examId, classId: _classId, sectionId, user }) {
    if (sectionId) {
      await this.verifyTeacherSectionAccess({ schoolId, sectionId, user });
    }

    const exam = await Exam.findOne({ _id: examId, schoolId }).lean();
    if (!exam) throw ApiError.notFound("Exam session not found");

    const filter = { schoolId, examId };
    if (sectionId) filter.sectionId = sectionId;

    const marks = await Mark.find(filter)
      .populate("studentId", "admissionNo name")
      .populate("subjectId", "name code")
      .populate("sectionId", "name")
      .lean();

    const examSubjects = await ExamSubject.find({ schoolId, examId }).lean();
    const subjectMaxMap = new Map();
    examSubjects.forEach((es) => {
      subjectMaxMap.set(es.subjectId.toString(), {
        totalMarks: es.totalMarks || 100,
        passingMarks: es.passingMarks || 33,
      });
    });

    // Group marks by student
    const studentMarksMap = new Map();
    marks.forEach((m) => {
      if (!m.studentId) return;
      const sId = m.studentId._id.toString();
      if (!studentMarksMap.has(sId)) {
        studentMarksMap.set(sId, {
          studentId: m.studentId._id,
          admissionNo: m.studentId.admissionNo,
          name: m.studentId.name,
          sectionName: m.sectionId?.name || "A",
          marks: [],
          totalObtained: 0,
          totalPossible: 0,
          hasFailedSubject: false,
        });
      }
      const sEntry = studentMarksMap.get(sId);
      const conf = subjectMaxMap.get(m.subjectId?._id?.toString()) || {
        totalMarks: 100,
        passingMarks: 33,
      };
      const obtained = m.isAbsent ? 0 : m.marksObtained;
      sEntry.marks.push({
        subjectName: m.subjectId?.name || "Subject",
        obtained,
        totalMarks: conf.totalMarks,
        isAbsent: m.isAbsent,
        isPass: obtained >= conf.passingMarks,
      });
      sEntry.totalObtained += obtained;
      sEntry.totalPossible += conf.totalMarks;
      if (obtained < conf.passingMarks) sEntry.hasFailedSubject = true;
    });

    let overallObtained = 0;
    let overallPossible = 0;
    let passCount = 0;
    let failCount = 0;
    let highestScore = 0;
    let lowestScore = 100;

    const gradeDistribution = {
      "A+": 0,
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };

    const studentResults = Array.from(studentMarksMap.values()).map((s) => {
      const pct = s.totalPossible > 0 ? Math.round((s.totalObtained / s.totalPossible) * 100) : 0;
      if (pct > highestScore) highestScore = pct;
      if (pct < lowestScore) lowestScore = pct;

      let grade = "F";
      if (pct >= 90) grade = "A+";
      else if (pct >= 80) grade = "A";
      else if (pct >= 70) grade = "B";
      else if (pct >= 60) grade = "C";
      else if (pct >= 50) grade = "D";

      gradeDistribution[grade]++;

      const isOverallPass = pct >= 40 && !s.hasFailedSubject;
      if (isOverallPass) passCount++;
      else failCount++;

      overallObtained += s.totalObtained;
      overallPossible += s.totalPossible;

      return {
        ...s,
        percentage: pct,
        grade,
        isOverallPass,
      };
    });

    // Sort by rank position
    studentResults.sort((a, b) => b.percentage - a.percentage);
    studentResults.forEach((s, idx) => {
      s.position = idx + 1;
    });

    const averagePct =
      overallPossible > 0 ? Math.round((overallObtained / overallPossible) * 100) : 0;

    const totalStudents = studentResults.length;
    const passRate = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;

    return {
      exam: {
        id: exam._id,
        name: exam.name,
        termName: exam.termName,
      },
      summary: {
        totalStudents,
        classAverage: averagePct,
        passRate,
        passCount,
        failCount,
        highestScore: totalStudents > 0 ? highestScore : 0,
        lowestScore: totalStudents > 0 ? lowestScore : 0,
        gradeDistribution,
      },
      records: studentResults,
    };
  }

  /**
   * 7. Export Exam Report as CSV
   */
  static async exportExamReportCSV(params) {
    const report = await this.getExamReport(params);

    const headers = [
      "Position",
      "Admission No",
      "Student Name",
      "Section",
      "Total Marks Obtained",
      "Max Marks",
      "Percentage",
      "Grade",
      "Result",
    ];

    const rows = report.records.map((r) => [
      r.position,
      r.admissionNo,
      `"${r.name.replace(/"/g, '""')}"`,
      r.sectionName,
      r.totalObtained,
      r.totalPossible,
      `${r.percentage}%`,
      r.grade,
      r.isOverallPass ? "Passed" : "Needs Improvement",
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }
}

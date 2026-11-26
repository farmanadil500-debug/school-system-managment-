import { Exam } from "./exam.model.js";
import { ExamSubject } from "./exam-subject.model.js";
import { Mark } from "./mark.model.js";
import { AcademicYear } from "../academic/academic-year.model.js";
import { Section } from "../academic/section.model.js";
import { Subject } from "../academic/subject.model.js";
import { TeachingAssignment } from "../academic/teaching-assignment.model.js";
import { Enrollment } from "../student/enrollment.model.js";
import { Student } from "../student/student.model.js";
import { User } from "../user/user.model.js";
import { ApiError } from "../../utils/api-error.js";
import { logAuditEvent } from "../../utils/audit.js";
import { ROLES } from "../../constants/index.js";

export class ExamService {
  /**
   * Helper: Calculate letter grade from percentage
   */
  static getGradeFromPercentage(percentage) {
    if (percentage >= 90) return { grade: "A+", remarks: "Outstanding" };
    if (percentage >= 80) return { grade: "A", remarks: "Excellent" };
    if (percentage >= 70) return { grade: "B", remarks: "Very Good" };
    if (percentage >= 60) return { grade: "C", remarks: "Good" };
    if (percentage >= 50) return { grade: "D", remarks: "Satisfactory" };
    return { grade: "F", remarks: "Needs Improvement" };
  }

  /**
   * Helper: Verify teacher subject assignment for a section
   */
  static async verifyTeacherSubjectAssignment({ schoolId, subjectId, sectionId, userId }) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.unauthorized("User not found");

    if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) {
      return true;
    }

    const staffId = user.staffId || user._id;

    const assignment = await TeachingAssignment.findOne({
      schoolId,
      subjectId,
      sectionId,
      staffId: { $in: [staffId, user._id] },
    });

    if (!assignment) {
      throw ApiError.forbidden(
        "You are not assigned to teach this subject in this section. Only assigned subject teachers or administrators can enter marks."
      );
    }

    return true;
  }

  /**
   * Create new exam
   */
  static async createExam({
    schoolId,
    name,
    termName,
    classIds = [],
    academicYearId,
    startDate = "",
    endDate = "",
    actorId,
    actorRole,
    ip,
  }) {
    let activeYearId = academicYearId;
    if (!activeYearId) {
      const currentYear = await AcademicYear.findOne({ schoolId, isCurrent: true });
      if (!currentYear) throw ApiError.badRequest("No active academic session found.");
      activeYearId = currentYear._id;
    }

    const exam = await Exam.create({
      schoolId,
      academicYearId: activeYearId,
      name: name.trim(),
      termName: termName.trim(),
      classIds,
      startDate,
      endDate,
      status: "scheduled",
    });

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "EXAM_CREATE",
      entityType: "Exam",
      entityId: exam._id,
      after: { name: exam.name, termName: exam.termName },
      ip,
    });

    return exam;
  }

  /**
   * List exams for the school
   */
  static async getExams({ schoolId, academicYearId, status, user }) {
    const filter = { schoolId };
    if (academicYearId) filter.academicYearId = academicYearId;

    // Student & Parent can only see published exams
    if (user?.role === ROLES.STUDENT || user?.role === ROLES.PARENT) {
      filter.status = "published";
    } else if (status) {
      filter.status = status;
    }

    return await Exam.find(filter)
      .sort({ createdAt: -1 })
      .populate("classIds", "name")
      .populate("academicYearId", "name isCurrent")
      .lean();
  }

  /**
   * Get exam by ID
   */
  static async getExamById(id, schoolId) {
    const exam = await Exam.findOne({ _id: id, schoolId })
      .populate("classIds", "name")
      .populate("academicYearId", "name isCurrent")
      .lean();

    if (!exam) throw ApiError.notFound("Exam not found");

    const subjects = await ExamSubject.find({ examId: id, schoolId })
      .populate("classId", "name")
      .populate("subjectId", "name code")
      .lean();

    return {
      ...exam,
      subjects,
    };
  }

  /**
   * Update exam (status transitions: locking, publishing, unlocking)
   */
  static async updateExam({ id, schoolId, updates, actorId, actorRole, ip }) {
    const exam = await Exam.findOne({ _id: id, schoolId });
    if (!exam) throw ApiError.notFound("Exam not found");

    const beforeStatus = exam.status;

    if (updates.name) exam.name = updates.name.trim();
    if (updates.termName) exam.termName = updates.termName.trim();
    if (updates.classIds) exam.classIds = updates.classIds;
    if (updates.startDate !== undefined) exam.startDate = updates.startDate;
    if (updates.endDate !== undefined) exam.endDate = updates.endDate;

    if (updates.status && updates.status !== exam.status) {
      exam.status = updates.status;

      if (updates.status === "locked") {
        exam.lockedAt = new Date();
      } else if (updates.status === "published") {
        exam.publishedAt = new Date();
      }

      // Audit unlock if moving from locked back to marking/scheduled
      if (beforeStatus === "locked" && updates.status !== "published") {
        await logAuditEvent({
          schoolId,
          actorId,
          actorRole,
          action: "EXAM_UNLOCK",
          entityType: "Exam",
          entityId: exam._id,
          before: { status: beforeStatus },
          after: { status: updates.status },
          ip,
        });
      }
    }

    await exam.save();

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "EXAM_UPDATE",
      entityType: "Exam",
      entityId: exam._id,
      after: { status: exam.status, name: exam.name },
      ip,
    });

    return exam;
  }

  /**
   * Add or update an exam subject schedule
   */
  static async addOrUpdateExamSubject({
    examId,
    schoolId,
    classId,
    subjectId,
    date = "",
    totalMarks = 100,
    passingMarks = 33,
    _actorId,
    _actorRole,
    _ip,
  }) {
    const exam = await Exam.findOne({ _id: examId, schoolId });
    if (!exam) throw ApiError.notFound("Exam not found");

    if (exam.status === "locked" || exam.status === "published") {
      throw ApiError.forbidden("Cannot modify subjects for a locked or published exam.");
    }

    const examSubject = await ExamSubject.findOneAndUpdate(
      { examId, classId, subjectId, schoolId },
      { date, totalMarks, passingMarks },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return examSubject;
  }

  /**
   * Enter / Update student marks in bulk for a subject and section
   */
  static async enterMarks({
    examId,
    schoolId,
    subjectId,
    sectionId,
    marks,
    actorId,
    actorRole,
    ip,
  }) {
    // 1. Verify Exam Status
    const exam = await Exam.findOne({ _id: examId, schoolId });
    if (!exam) throw ApiError.notFound("Exam not found");

    if (exam.status === "locked" || exam.status === "published") {
      throw ApiError.forbidden(
        "Marks entry is locked for this exam. Contact an administrator to unlock before editing."
      );
    }

    // 2. Verify Teacher Subject Authorization
    if (actorRole === ROLES.TEACHER) {
      await this.verifyTeacherSubjectAssignment({
        schoolId,
        subjectId,
        sectionId,
        userId: actorId,
      });
    }

    // 3. Resolve Section and Class
    const section = await Section.findOne({ _id: sectionId, schoolId });
    if (!section) throw ApiError.notFound("Section not found");

    // 4. Resolve Exam Subject Max Marks
    const examSubject = await ExamSubject.findOne({
      examId,
      subjectId,
      classId: section.classId,
      schoolId,
    });

    const maxMarks = examSubject?.totalMarks || 100;

    // Validate marks do not exceed maximum
    for (const entry of marks) {
      if (entry.marksObtained > maxMarks) {
        throw ApiError.badRequest(
          `Marks obtained (${entry.marksObtained}) cannot exceed total marks (${maxMarks}).`
        );
      }
    }

    // 5. Bulk Upsert Marks
    const bulkOps = marks.map((m) => ({
      updateOne: {
        filter: {
          examId,
          subjectId,
          studentId: m.studentId,
        },
        update: {
          $set: {
            schoolId,
            examId,
            subjectId,
            classId: section.classId,
            sectionId,
            studentId: m.studentId,
            marksObtained: m.isAbsent ? 0 : m.marksObtained,
            isAbsent: !!m.isAbsent,
            remarks: m.remarks ? m.remarks.trim() : "",
            enteredBy: actorId,
          },
        },
        upsert: true,
      },
    }));

    await Mark.bulkWrite(bulkOps);

    // Update exam status to "marking" if still "scheduled"
    if (exam.status === "scheduled") {
      exam.status = "marking";
      await exam.save();
    }

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "MARKS_ENTRY",
      entityType: "Mark",
      entityId: examId,
      after: {
        subjectId,
        sectionId,
        recordCount: marks.length,
      },
      ip,
    });

    return {
      message: "Marks saved successfully.",
      recordCount: marks.length,
    };
  }

  /**
   * Get marks entry sheet for a subject and section
   */
  static async getSectionMarks({ examId, schoolId, subjectId, sectionId, user }) {
    const exam = await Exam.findOne({ _id: examId, schoolId }).lean();
    if (!exam) throw ApiError.notFound("Exam not found");

    const section = await Section.findOne({ _id: sectionId, schoolId })
      .populate("classId", "name")
      .lean();
    if (!section) throw ApiError.notFound("Section not found");

    const subject = await Subject.findOne({ _id: subjectId, schoolId }).lean();
    if (!subject) throw ApiError.notFound("Subject not found");

    const examSubject = await ExamSubject.findOne({
      examId,
      subjectId,
      classId: section.classId?._id || section.classId,
      schoolId,
    }).lean();

    // Fetch students enrolled in this section
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

    if (students.length === 0) {
      const direct = await Student.find({ schoolId, sectionId, status: "active" })
        .sort({ rollNo: 1 })
        .lean();

      students = direct.map((s) => ({
        studentId: s._id,
        name: s.name,
        admissionNo: s.admissionNo,
        rollNo: s.rollNo,
        gender: s.gender,
      }));
    }

    // Fetch recorded marks
    const recordedMarks = await Mark.find({
      examId,
      subjectId,
      sectionId,
      schoolId,
    }).lean();

    const marksMap = new Map();
    recordedMarks.forEach((m) => marksMap.set(m.studentId.toString(), m));

    const totalMarks = examSubject?.totalMarks || 100;
    const passingMarks = examSubject?.passingMarks || 33;

    const merged = students.map((s) => {
      const entry = marksMap.get(s.studentId.toString());
      const marksObtained = entry ? entry.marksObtained : 0;
      const isAbsent = entry ? entry.isAbsent : false;
      const isPassed = !isAbsent && marksObtained >= passingMarks;
      const pct = Math.round((marksObtained / totalMarks) * 100);

      return {
        studentId: s.studentId,
        name: s.name,
        admissionNo: s.admissionNo,
        rollNo: s.rollNo,
        marksObtained,
        isAbsent,
        remarks: entry?.remarks || "",
        isPassed,
        percentage: pct,
        grade: isAbsent ? "ABS" : this.getGradeFromPercentage(pct).grade,
        isRecorded: !!entry,
      };
    });

    const canEdit =
      user.role === ROLES.SUPER_ADMIN ||
      user.role === ROLES.ADMIN ||
      (user.role === ROLES.TEACHER && exam.status !== "locked" && exam.status !== "published");

    return {
      exam: {
        _id: exam._id,
        name: exam.name,
        termName: exam.termName,
        status: exam.status,
      },
      subject: {
        _id: subject._id,
        name: subject.name,
        code: subject.code,
      },
      section: {
        _id: section._id,
        name: section.name,
        className: section.classId?.name,
      },
      totalMarks,
      passingMarks,
      canEdit,
      records: merged,
    };
  }

  /**
   * Get printable report card for a student
   */
  static async getStudentReportCard({ examId, schoolId, studentId, user }) {
    const exam = await Exam.findOne({ _id: examId, schoolId }).lean();
    if (!exam) throw ApiError.notFound("Exam not found");

    // Student & Parent can only view published results
    if (
      (user.role === ROLES.STUDENT || user.role === ROLES.PARENT) &&
      exam.status !== "published"
    ) {
      throw ApiError.forbidden("Results for this exam have not been published yet.");
    }

    if (user.role === ROLES.STUDENT && user.studentId?.toString() !== studentId.toString()) {
      throw ApiError.forbidden("You can only view your own report card.");
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
        throw ApiError.forbidden("You can only view report cards for your own children.");
      }
    }

    const student = await Student.findOne({ _id: studentId, schoolId })
      .populate("guardianId", "name phone")
      .populate("currentEnrollmentId")
      .lean();

    if (!student) throw ApiError.notFound("Student not found");

    const enrollment = await Enrollment.findOne({
      studentId,
      academicYearId: exam.academicYearId,
      schoolId,
    })
      .populate("classId", "name")
      .populate("sectionId", "name")
      .lean();

    const classId = enrollment?.classId?._id || student.classId;
    const sectionId = enrollment?.sectionId?._id || student.sectionId;

    // Fetch all exam subjects for this student's class
    const examSubjects = await ExamSubject.find({ examId, classId, schoolId })
      .populate("subjectId", "name code")
      .lean();

    // Fetch marks obtained by this student
    const studentMarks = await Mark.find({ examId, studentId, schoolId }).lean();
    const marksMap = new Map();
    studentMarks.forEach((m) => marksMap.set(m.subjectId.toString(), m));

    let grandTotalMax = 0;
    let grandTotalObtained = 0;
    let allPassed = true;

    const subjectsResults = examSubjects.map((es) => {
      const subjectName = es.subjectId?.name || "Subject";
      const subjectCode = es.subjectId?.code || "";
      const markEntry = marksMap.get(es.subjectId?._id?.toString());

      const marksObtained = markEntry ? markEntry.marksObtained : 0;
      const isAbsent = markEntry ? markEntry.isAbsent : false;
      const isPassed = !isAbsent && marksObtained >= es.passingMarks;
      if (!isPassed) allPassed = false;

      grandTotalMax += es.totalMarks;
      grandTotalObtained += marksObtained;

      const pct = es.totalMarks > 0 ? Math.round((marksObtained / es.totalMarks) * 100) : 0;
      const gradeInfo = isAbsent
        ? { grade: "ABS", remarks: "Absent" }
        : this.getGradeFromPercentage(pct);

      return {
        subjectName,
        subjectCode,
        totalMarks: es.totalMarks,
        passingMarks: es.passingMarks,
        marksObtained,
        isAbsent,
        isPassed,
        percentage: pct,
        grade: gradeInfo.grade,
        remarks: gradeInfo.remarks,
      };
    });

    const overallPercentage =
      grandTotalMax > 0 ? Math.round((grandTotalObtained / grandTotalMax) * 100) : 0;
    const overallGradeInfo = this.getGradeFromPercentage(overallPercentage);

    // Calculate class rank / position
    let position = 1;
    let totalInClass = 1;

    if (sectionId) {
      const allClassMarks = await Mark.aggregate([
        { $match: { examId: exam._id, sectionId } },
        {
          $group: {
            _id: "$studentId",
            totalScore: { $sum: "$marksObtained" },
          },
        },
        { $sort: { totalScore: -1 } },
      ]);

      totalInClass = allClassMarks.length || 1;
      const rankIdx = allClassMarks.findIndex((m) => m._id.toString() === studentId.toString());
      if (rankIdx !== -1) {
        position = rankIdx + 1;
      }
    }

    return {
      exam: {
        _id: exam._id,
        name: exam.name,
        termName: exam.termName,
        status: exam.status,
      },
      student: {
        _id: student._id,
        name: student.name,
        admissionNo: student.admissionNo,
        rollNo: enrollment?.rollNo || student.rollNo,
        className: enrollment?.classId?.name || "Class",
        sectionName: enrollment?.sectionId?.name || "A",
        guardianName: student.guardianId?.name,
      },
      subjects: subjectsResults,
      summary: {
        totalMarks: grandTotalMax,
        obtainedMarks: grandTotalObtained,
        percentage: overallPercentage,
        grade: overallGradeInfo.grade,
        remarks: overallGradeInfo.remarks,
        result: allPassed ? "PASSED" : "FAILED",
        position,
        totalInClass,
      },
    };
  }
}

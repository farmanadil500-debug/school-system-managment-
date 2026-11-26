import bcrypt from "bcryptjs";
import { Student } from "./student.model.js";
import { Guardian } from "./guardian.model.js";
import { Enrollment } from "./enrollment.model.js";
import { AcademicYear } from "../academic/academic-year.model.js";
import { Class } from "../academic/class.model.js";
import { Section } from "../academic/section.model.js";
import { User } from "../user/user.model.js";
import { getNextSequence } from "../counter/counter.model.js";
import { ApiError } from "../../utils/api-error.js";
import { logAuditEvent } from "../../utils/audit.js";
import { ROLES, USER_STATUS } from "../../constants/index.js";

export class StudentService {
  /**
   * Admits a new student with guardian and enrollment records.
   */
  static async admitStudent({
    schoolId,
    name,
    dob,
    gender,
    address = "",
    bloodGroup = "",
    emergencyPhone = "",
    admissionDate = new Date(),
    classId,
    sectionId,
    academicYearId,
    rollNo,
    guardian,
    createParentLogin = false,
    createStudentLogin = false,
    actorId,
    actorRole,
    ip,
  }) {
    // 1. Resolve Academic Year
    let targetYearId = academicYearId;
    if (!targetYearId) {
      const currentYear = await AcademicYear.findOne({ schoolId, isCurrent: true });
      if (!currentYear) {
        throw ApiError.badRequest(
          "No active academic session found. Please configure an academic year in Settings first."
        );
      }
      targetYearId = currentYear._id;
    }

    // 2. Validate Class & Section
    const cls = await Class.findOne({ _id: classId, schoolId });
    if (!cls) throw ApiError.notFound("Target class not found");

    const sec = await Section.findOne({ _id: sectionId, classId, schoolId });
    if (!sec) throw ApiError.notFound("Target section not found");

    // Check section capacity
    const currentCount = await Enrollment.countDocuments({
      academicYearId: targetYearId,
      sectionId,
      outcome: "active",
    });
    if (sec.capacity && currentCount >= sec.capacity) {
      throw ApiError.conflict(
        `Section ${sec.name} of ${cls.name} has reached its maximum capacity of ${sec.capacity} students.`
      );
    }

    // 3. Generate Sequential Admission Number
    const yearPrefix = new Date().getFullYear();
    const seq = await getNextSequence(schoolId, `admission_${yearPrefix}`);
    const admissionNo = `ADM-${yearPrefix}-${String(seq).padStart(4, "0")}`;

    // 4. Create or link Guardian
    let guardianRecord = await Guardian.findOne({
      schoolId,
      phone: guardian.phone.trim(),
    });

    if (!guardianRecord) {
      guardianRecord = await Guardian.create({
        schoolId,
        name: guardian.name.trim(),
        relation: guardian.relation || "father",
        phone: guardian.phone.trim(),
        email: guardian.email ? guardian.email.trim().toLowerCase() : "",
        occupation: guardian.occupation || "",
        cnic: guardian.cnic || "",
      });
    }

    // 5. Create Student
    const student = await Student.create({
      schoolId,
      admissionNo,
      name: name.trim(),
      dob,
      gender: gender.toLowerCase(),
      guardianIds: [guardianRecord._id],
      address,
      admissionDate,
      bloodGroup,
      emergencyPhone: emergencyPhone || guardian.phone,
      status: "active",
    });

    // 6. Assign Roll Number if not supplied
    let assignedRollNo = rollNo;
    if (!assignedRollNo) {
      assignedRollNo = currentCount + 1;
    }

    // 7. Create Enrollment record
    const enrollment = await Enrollment.create({
      schoolId,
      studentId: student._id,
      academicYearId: targetYearId,
      classId,
      sectionId,
      rollNo: assignedRollNo,
      outcome: "active",
    });

    student.currentEnrollmentId = enrollment._id;
    await student.save();

    // 8. Optional: Create Portal Accounts
    if (createParentLogin && guardian.phone) {
      const existingUser = await User.findOne({
        $or: [{ phone: guardian.phone.trim() }, { email: guardian.email || "___" }],
      });
      if (!existingUser) {
        const tempPass = "Parent@123";
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(tempPass, salt);
        await User.create({
          schoolId,
          phone: guardian.phone.trim(),
          email: guardian.email ? guardian.email.trim().toLowerCase() : undefined,
          passwordHash,
          role: ROLES.PARENT,
          guardianId: guardianRecord._id,
          status: USER_STATUS.ACTIVE,
          mustChangePassword: true,
        });
      }
    }

    if (createStudentLogin) {
      const existingUser = await User.findOne({
        phone: admissionNo,
      });
      if (!existingUser) {
        const tempPass = "Student@123";
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(tempPass, salt);
        await User.create({
          schoolId,
          phone: admissionNo,
          passwordHash,
          role: ROLES.STUDENT,
          studentId: student._id,
          status: USER_STATUS.ACTIVE,
          mustChangePassword: true,
        });
      }
    }

    // 9. Audit Log
    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "STUDENT_ADMISSION",
      entityType: "Student",
      entityId: student._id,
      after: {
        admissionNo,
        name: student.name,
        class: cls.name,
        section: sec.name,
        rollNo: assignedRollNo,
      },
      ip,
    });

    return {
      student: student.toJSON(),
      enrollment: enrollment.toJSON(),
      guardian: guardianRecord.toJSON(),
    };
  }

  /**
   * List students with filtering, pagination, and search.
   */
  static async listStudents({
    schoolId,
    academicYearId,
    classId,
    sectionId,
    status,
    q,
    page = 1,
    limit = 20,
  }) {
    // Step A: Determine enrollment filters
    const enrollmentFilter = { schoolId };
    if (academicYearId) enrollmentFilter.academicYearId = academicYearId;
    if (classId) enrollmentFilter.classId = classId;
    if (sectionId) enrollmentFilter.sectionId = sectionId;

    let matchingEnrollments = [];
    if (academicYearId || classId || sectionId) {
      matchingEnrollments = await Enrollment.find(enrollmentFilter).select("studentId").lean();
    }

    // Step B: Build Student filter
    const studentFilter = { schoolId };
    if (matchingEnrollments.length > 0) {
      studentFilter._id = { $in: matchingEnrollments.map((e) => e.studentId) };
    } else if (academicYearId || classId || sectionId) {
      // Filter matched zero enrollments
      return { students: [], meta: { page, limit, total: 0 } };
    }

    if (status) {
      studentFilter.status = status;
    }

    if (q) {
      const cleanQ = q.trim();
      studentFilter.$or = [
        { name: { $regex: cleanQ, $options: "i" } },
        { admissionNo: { $regex: cleanQ, $options: "i" } },
      ];
    }

    const total = await Student.countDocuments(studentFilter);
    const students = await Student.find(studentFilter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "currentEnrollmentId",
        populate: [
          { path: "classId", select: "name order" },
          { path: "sectionId", select: "name" },
          { path: "academicYearId", select: "name isCurrent" },
        ],
      })
      .populate("guardianIds", "name relation phone occupation")
      .lean();

    // Transform for UI readability
    const formatted = students.map((s) => ({
      ...s,
      className: s.currentEnrollmentId?.classId?.name || "Unassigned",
      sectionName: s.currentEnrollmentId?.sectionId?.name || "—",
      rollNo: s.currentEnrollmentId?.rollNo || "—",
      parentName: s.guardianIds?.[0]?.name || "—",
      parentPhone: s.guardianIds?.[0]?.phone || "—",
    }));

    return {
      students: formatted,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  /**
   * Get single student profile with full enrollment history.
   */
  static async getStudentById(id, schoolId) {
    const student = await Student.findOne({ _id: id, schoolId })
      .populate("guardianIds")
      .populate({
        path: "currentEnrollmentId",
        populate: [
          { path: "classId", select: "name order" },
          { path: "sectionId", select: "name" },
          { path: "academicYearId", select: "name isCurrent" },
        ],
      })
      .lean();

    if (!student) {
      throw ApiError.notFound("Student not found");
    }

    // Mask sensitive CNIC
    if (student.guardianIds) {
      student.guardianIds = student.guardianIds.map((g) => ({
        ...g,
        cnic: g.cnic ? `${g.cnic.slice(0, 5)}******` : "",
      }));
    }

    const enrollmentHistory = await Enrollment.find({ studentId: id, schoolId })
      .populate("academicYearId", "name isCurrent")
      .populate("classId", "name order")
      .populate("sectionId", "name")
      .sort({ createdAt: -1 })
      .lean();

    return {
      ...student,
      enrollmentHistory,
    };
  }

  /**
   * Update student details.
   */
  static async updateStudent({ id, schoolId, updates, actorId, actorRole, ip }) {
    const student = await Student.findOne({ _id: id, schoolId });
    if (!student) throw ApiError.notFound("Student not found");

    const before = {
      name: student.name,
      status: student.status,
      address: student.address,
    };

    if (updates.name) student.name = updates.name.trim();
    if (updates.dob) student.dob = updates.dob;
    if (updates.gender) student.gender = updates.gender.toLowerCase();
    if (updates.address !== undefined) student.address = updates.address;
    if (updates.bloodGroup !== undefined) student.bloodGroup = updates.bloodGroup;
    if (updates.emergencyPhone !== undefined) student.emergencyPhone = updates.emergencyPhone;
    if (updates.status) student.status = updates.status;

    await student.save();

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "STUDENT_UPDATE",
      entityType: "Student",
      entityId: student._id,
      before,
      after: {
        name: student.name,
        status: student.status,
      },
      ip,
    });

    return student.toJSON();
  }

  /**
   * Bulk promote or repeat students into a new academic session and class/section.
   */
  static async promoteStudents({
    schoolId,
    studentIds,
    targetAcademicYearId,
    targetClassId,
    targetSectionId,
    outcome = "promoted",
    actorId,
    actorRole,
    ip,
  }) {
    const targetYear = await AcademicYear.findOne({ _id: targetAcademicYearId, schoolId });
    if (!targetYear) throw ApiError.notFound("Target academic year not found");

    const targetClass = await Class.findOne({ _id: targetClassId, schoolId });
    if (!targetClass) throw ApiError.notFound("Target class not found");

    const targetSection = await Section.findOne({
      _id: targetSectionId,
      classId: targetClassId,
      schoolId,
    });
    if (!targetSection) throw ApiError.notFound("Target section not found");

    let promotedCount = 0;

    for (const studentId of studentIds) {
      const student = await Student.findOne({ _id: studentId, schoolId });
      if (!student) continue;

      // Mark current enrollment with outcome
      if (student.currentEnrollmentId) {
        await Enrollment.updateOne({ _id: student.currentEnrollmentId }, { outcome });
      }

      // Check if student already enrolled in target year
      let targetEnrollment = await Enrollment.findOne({
        studentId,
        academicYearId: targetAcademicYearId,
      });

      if (!targetEnrollment) {
        const count = await Enrollment.countDocuments({
          academicYearId: targetAcademicYearId,
          sectionId: targetSectionId,
        });

        targetEnrollment = await Enrollment.create({
          schoolId,
          studentId,
          academicYearId: targetAcademicYearId,
          classId: targetClassId,
          sectionId: targetSectionId,
          rollNo: count + 1,
          outcome: "active",
        });
      }

      student.currentEnrollmentId = targetEnrollment._id;
      await student.save();
      promotedCount += 1;
    }

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "STUDENTS_PROMOTION",
      entityType: "Enrollment",
      entityId: targetAcademicYearId,
      after: {
        promotedCount,
        targetClass: targetClass.name,
        targetSection: targetSection.name,
        outcome,
      },
      ip,
    });

    return {
      message: `Successfully processed ${promotedCount} student(s) into ${targetClass.name} - Section ${targetSection.name}.`,
      promotedCount,
    };
  }

  /**
   * Export student roster as CSV.
   */
  static async exportStudentsCSV({ schoolId, academicYearId, classId, sectionId }) {
    const { students } = await this.listStudents({
      schoolId,
      academicYearId,
      classId,
      sectionId,
      limit: 1000,
    });

    const headers = [
      "Admission No",
      "Full Name",
      "Gender",
      "Class",
      "Section",
      "Roll No",
      "Guardian Name",
      "Guardian Phone",
      "Status",
    ];

    const rows = students.map((s) => [
      s.admissionNo,
      `"${s.name.replace(/"/g, '""')}"`,
      s.gender,
      s.className,
      s.sectionName,
      s.rollNo,
      `"${s.parentName.replace(/"/g, '""')}"`,
      s.parentPhone,
      s.status,
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
}

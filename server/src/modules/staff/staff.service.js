import bcrypt from "bcryptjs";
import { Staff } from "./staff.model.js";
import { User } from "../user/user.model.js";
import { Section } from "../academic/section.model.js";
import { TeachingAssignment } from "../academic/teaching-assignment.model.js";
import { getNextSequence } from "../counter/counter.model.js";
import { ApiError } from "../../utils/api-error.js";
import { logAuditEvent } from "../../utils/audit.js";
import { ROLES, USER_STATUS } from "../../constants/index.js";

export class StaffService {
  /**
   * Create a new staff profile and optional portal login account.
   */
  static async createStaff({
    schoolId,
    name,
    staffType = "teacher",
    phone,
    email = "",
    qualification = "",
    experience = "",
    joinDate = new Date(),
    salary = 0,
    createLoginAccount = false,
    password = "Staff@123",
    actorId,
    actorRole,
    ip,
  }) {
    // 1. Generate unique atomic Employee ID
    const seq = await getNextSequence(schoolId, "staff_employee");
    const employeeNo = `EMP-${String(seq).padStart(3, "0")}`;

    // 2. Create Staff Record
    const staff = await Staff.create({
      schoolId,
      employeeNo,
      name: name.trim(),
      staffType,
      phone: phone.trim(),
      email: email ? email.trim().toLowerCase() : "",
      qualification: qualification.trim(),
      experience: experience.trim(),
      joinDate,
      salary,
      status: "active",
    });

    // 3. Optional: Create Portal User Account
    if (createLoginAccount && (email || phone)) {
      const normalizedEmail = email ? email.trim().toLowerCase() : undefined;
      const normalizedPhone = phone ? phone.trim() : undefined;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      });

      if (!existingUser) {
        // Map staffType to System Role
        let role = ROLES.TEACHER;
        if (staffType === "accountant") role = ROLES.ACCOUNTANT;
        if (staffType === "admin") role = ROLES.ADMIN;

        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await User.create({
          schoolId,
          email: normalizedEmail,
          phone: normalizedPhone,
          passwordHash,
          role,
          staffId: staff._id,
          status: USER_STATUS.ACTIVE,
          mustChangePassword: true,
        });

        staff.userId = newUser._id;
        await staff.save();
      } else {
        staff.userId = existingUser._id;
        existingUser.staffId = staff._id;
        await Promise.all([staff.save(), existingUser.save()]);
      }
    }

    // 4. Audit Log
    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "STAFF_CREATE",
      entityType: "Staff",
      entityId: staff._id,
      after: {
        employeeNo,
        name: staff.name,
        staffType,
        phone: staff.phone,
      },
      ip,
    });

    return staff.toJSON();
  }

  /**
   * List staff members with filters, pagination, and teaching assignments.
   */
  static async listStaff({ schoolId, staffType, status, q, page = 1, limit = 20 }) {
    const filter = { schoolId };

    if (staffType) filter.staffType = staffType;
    if (status) filter.status = status;

    if (q) {
      const cleanQ = q.trim();
      filter.$or = [
        { name: { $regex: cleanQ, $options: "i" } },
        { employeeNo: { $regex: cleanQ, $options: "i" } },
        { phone: { $regex: cleanQ, $options: "i" } },
      ];
    }

    const total = await Staff.countDocuments(filter);
    const staffList = await Staff.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("userId", "email phone role")
      .lean();

    // Attach Class Teacher and Subject info for teachers
    const staffIds = staffList.map((s) => s._id);
    const userIds = staffList.map((s) => s.userId?._id).filter(Boolean);

    const [classTeacherSections, assignments] = await Promise.all([
      Section.find({ schoolId, classTeacherId: { $in: staffIds } })
        .populate("classId", "name")
        .lean(),
      TeachingAssignment.find({
        schoolId,
        staffId: { $in: [...staffIds, ...userIds] },
      })
        .populate("sectionId", "name classId")
        .populate("subjectId", "name code")
        .lean(),
    ]);

    const formatted = staffList.map((staff) => {
      const classTeacherSection = classTeacherSections.find(
        (sec) => sec.classTeacherId?.toString() === staff._id.toString()
      );

      const staffAssignments = assignments.filter(
        (a) =>
          a.staffId?.toString() === staff._id.toString() ||
          a.staffId?.toString() === staff.userId?._id?.toString()
      );

      return {
        ...staff,
        classTeacherOf: classTeacherSection
          ? `${classTeacherSection.classId?.name} - Sec ${classTeacherSection.name}`
          : null,
        assignments: staffAssignments.map((a) => ({
          subject: a.subjectId?.name || "Subject",
          code: a.subjectId?.code || "",
          section: a.sectionId?.name || "",
        })),
      };
    });

    return {
      staff: formatted,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  /**
   * Get staff member by ID with teaching assignments and class teacher links.
   */
  static async getStaffById(id, schoolId) {
    const staff = await Staff.findOne({ _id: id, schoolId })
      .populate("userId", "email phone role lastLoginAt")
      .lean();

    if (!staff) {
      throw ApiError.notFound("Staff member not found");
    }

    const [classTeacherSections, assignments] = await Promise.all([
      Section.find({ schoolId, classTeacherId: staff._id }).populate("classId", "name").lean(),
      TeachingAssignment.find({
        schoolId,
        staffId: { $in: [staff._id, staff.userId?._id].filter(Boolean) },
      })
        .populate("sectionId", "name classId")
        .populate("subjectId", "name code")
        .populate("academicYearId", "name isCurrent")
        .lean(),
    ]);

    return {
      ...staff,
      classTeacherOf: classTeacherSections.map((s) => `${s.classId?.name} - Sec ${s.name}`),
      assignments,
    };
  }

  /**
   * Update staff details.
   */
  static async updateStaff({ id, schoolId, updates, actorId, actorRole, ip }) {
    const staff = await Staff.findOne({ _id: id, schoolId });
    if (!staff) throw ApiError.notFound("Staff member not found");

    const before = {
      name: staff.name,
      status: staff.status,
      phone: staff.phone,
      qualification: staff.qualification,
    };

    if (updates.name) staff.name = updates.name.trim();
    if (updates.phone) staff.phone = updates.phone.trim();
    if (updates.email !== undefined) staff.email = updates.email.trim().toLowerCase();
    if (updates.qualification !== undefined) staff.qualification = updates.qualification.trim();
    if (updates.experience !== undefined) staff.experience = updates.experience.trim();
    if (updates.status) staff.status = updates.status;
    if (updates.salary !== undefined) staff.salary = updates.salary;

    await staff.save();

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "STAFF_UPDATE",
      entityType: "Staff",
      entityId: staff._id,
      before,
      after: {
        name: staff.name,
        status: staff.status,
        phone: staff.phone,
      },
      ip,
    });

    return staff.toJSON();
  }

  /**
   * Soft-delete / deactivate staff member.
   */
  static async deleteStaff({ id, schoolId, actorId, actorRole, ip }) {
    const staff = await Staff.findOne({ _id: id, schoolId });
    if (!staff) throw ApiError.notFound("Staff member not found");

    staff.status = "inactive";
    await staff.save();

    // Deactivate linked user account if exists
    if (staff.userId) {
      await User.updateOne({ _id: staff.userId }, { status: USER_STATUS.INACTIVE });
    }

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "STAFF_DEACTIVATE",
      entityType: "Staff",
      entityId: staff._id,
      before: { status: "active" },
      after: { status: "inactive" },
      ip,
    });

    return { message: `Staff member "${staff.name}" has been deactivated.` };
  }
}

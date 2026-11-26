import { Notice } from "./notice.model.js";
import { Enrollment } from "../student/enrollment.model.js";
import { Student } from "../student/student.model.js";
import { Section } from "../academic/section.model.js";
import { TeachingAssignment } from "../academic/teaching-assignment.model.js";
import { ApiError } from "../../utils/api-error.js";
import { logAuditEvent } from "../../utils/audit.js";
import { ROLES } from "../../constants/index.js";

export class NoticeService {
  /**
   * Helper: Build role-based audience query filter for notices
   */
  static async buildAudienceFilter({ schoolId, user }) {
    if (!user) throw ApiError.unauthorized("Authentication required");

    // Super Admin & Admin can view all notices
    if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) {
      return { schoolId };
    }

    const now = new Date();
    const expiryFilter = {
      $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }],
    };

    const currentUserId = user.userId || user._id || user.sub;

    // Teacher: Notices targeted to teachers or created by this teacher
    if (user.role === ROLES.TEACHER) {
      return {
        schoolId,
        $or: [
          { createdBy: currentUserId },
          {
            status: "published",
            ...expiryFilter,
            $or: [{ "audience.roles": { $size: 0 } }, { "audience.roles": ROLES.TEACHER }],
          },
        ],
      };
    }

    // Student: Notices for students matching their active enrolled class
    if (user.role === ROLES.STUDENT) {
      let studentClassId = null;
      if (user.studentId) {
        const enrollment = await Enrollment.findOne({
          schoolId,
          studentId: user.studentId,
          outcome: "active",
        });
        if (enrollment) studentClassId = enrollment.classId;
      }

      const classAudienceFilter = studentClassId
        ? [{ "audience.classIds": { $size: 0 } }, { "audience.classIds": studentClassId }]
        : [{ "audience.classIds": { $size: 0 } }];

      return {
        schoolId,
        status: "published",
        ...expiryFilter,
        $and: [
          { $or: [{ "audience.roles": { $size: 0 } }, { "audience.roles": ROLES.STUDENT }] },
          { $or: classAudienceFilter },
        ],
      };
    }

    // Parent: Notices for parents matching any of their children's enrolled classes
    if (user.role === ROLES.PARENT) {
      let childClassIds = [];
      if (user.guardianId) {
        const children = await Student.find({
          schoolId,
          guardianIds: user.guardianId,
        }).select("_id");

        if (children.length > 0) {
          const enrollments = await Enrollment.find({
            schoolId,
            studentId: { $in: children.map((c) => c._id) },
            outcome: "active",
          }).select("classId");
          childClassIds = enrollments.map((e) => e.classId);
        }
      }

      const classAudienceFilter =
        childClassIds.length > 0
          ? [{ "audience.classIds": { $size: 0 } }, { "audience.classIds": { $in: childClassIds } }]
          : [{ "audience.classIds": { $size: 0 } }];

      return {
        schoolId,
        status: "published",
        ...expiryFilter,
        $and: [
          { $or: [{ "audience.roles": { $size: 0 } }, { "audience.roles": ROLES.PARENT }] },
          { $or: classAudienceFilter },
        ],
      };
    }

    // Accountant: Notices targeted to accountant or all staff
    if (user.role === ROLES.ACCOUNTANT) {
      return {
        schoolId,
        status: "published",
        ...expiryFilter,
        $or: [{ "audience.roles": { $size: 0 } }, { "audience.roles": ROLES.ACCOUNTANT }],
      };
    }

    return { schoolId, status: "published", ...expiryFilter };
  }

  /**
   * Helper: Check if teacher is assigned to specified classes or sections
   */
  static async verifyTeacherScope({ schoolId, teacherUserId, classIds = [], sectionIds = [] }) {
    if (classIds.length === 0 && sectionIds.length === 0) {
      return true;
    }

    const assignedSectionIds = new Set();

    // Check Class Teacher sections
    const classTeacherSections = await Section.find({
      schoolId,
      classTeacherId: teacherUserId,
    }).select("_id classId");

    classTeacherSections.forEach((s) => {
      assignedSectionIds.add(s._id.toString());
    });

    // Check Subject Teaching Assignments
    const teachingAssignments = await TeachingAssignment.find({
      schoolId,
      staffId: teacherUserId,
    }).select("sectionId");

    teachingAssignments.forEach((ta) => {
      assignedSectionIds.add(ta.sectionId.toString());
    });

    if (sectionIds.length > 0) {
      const unauthorizedSection = sectionIds.find(
        (secId) => !assignedSectionIds.has(secId.toString())
      );
      if (unauthorizedSection) {
        throw ApiError.forbidden(
          "Teachers can only target notices to their assigned classes or sections."
        );
      }
    }

    return true;
  }

  /**
   * List notices with pagination, audience filtering, and search
   */
  static async getNotices({ schoolId, page = 1, limit = 20, status, q, role, classId, user }) {
    const baseFilter = await this.buildAudienceFilter({ schoolId, user });
    const filter = { ...baseFilter };

    // Explicit status filter for admins
    if (status && (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN)) {
      filter.status = status;
    }

    // Target role filter
    if (role) {
      filter["audience.roles"] = role;
    }

    // Target class filter
    if (classId) {
      filter["audience.classIds"] = classId;
    }

    // Text search query
    if (q) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [{ title: { $regex: q, $options: "i" } }, { body: { $regex: q, $options: "i" } }],
      });
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [notices, total] = await Promise.all([
      Notice.find(filter)
        .sort({ isPinned: -1, publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("createdBy", "name role")
        .populate("audience.classIds", "name")
        .populate("audience.sectionIds", "name")
        .lean(),
      Notice.countDocuments(filter),
    ]);

    return {
      notices,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Get single notice by ID
   */
  static async getNoticeById({ schoolId, noticeId, user }) {
    const notice = await Notice.findOne({ _id: noticeId, schoolId })
      .populate("createdBy", "name role")
      .populate("audience.classIds", "name")
      .populate("audience.sectionIds", "name")
      .lean();

    if (!notice) {
      throw ApiError.notFound("Notice not found");
    }

    // Validate audience access for non-admin roles
    if (user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.ADMIN) {
      if (
        notice.status !== "published" &&
        notice.createdBy?._id?.toString() !== user._id.toString()
      ) {
        throw ApiError.forbidden("You do not have permission to view this notice");
      }
    }

    return notice;
  }

  /**
   * Create new notice
   */
  static async createNotice({ schoolId, data, user, ip }) {
    const currentUserId = user.userId || user._id || user.sub;

    // If teacher, verify they only target their assigned classes/sections
    if (user.role === ROLES.TEACHER) {
      await this.verifyTeacherScope({
        schoolId,
        teacherUserId: user.staffId || currentUserId,
        classIds: data.classIds,
        sectionIds: data.sectionIds,
      });
    }

    const notice = await Notice.create({
      schoolId,
      title: data.title.trim(),
      body: data.body.trim(),
      audience: {
        roles: data.roles || [],
        classIds: data.classIds || [],
        sectionIds: data.sectionIds || [],
      },
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date(),
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      status: data.status || "published",
      isPinned: Boolean(data.isPinned),
      attachmentUrl: data.attachmentUrl ? data.attachmentUrl.trim() : "",
      createdBy: currentUserId,
    });

    await logAuditEvent({
      actorId: currentUserId,
      actorRole: user.role,
      action: "NOTICE_CREATED",
      entityType: "Notice",
      entityId: notice._id,
      after: {
        title: notice.title,
        status: notice.status,
        roles: notice.audience.roles,
      },
      ip,
    });

    return Notice.findById(notice._id)
      .populate("createdBy", "name role")
      .populate("audience.classIds", "name")
      .populate("audience.sectionIds", "name");
  }

  /**
   * Update existing notice
   */
  static async updateNotice({ schoolId, noticeId, updateData, user, ip }) {
    const currentUserId = user.userId || user._id || user.sub;
    const notice = await Notice.findOne({ _id: noticeId, schoolId });
    if (!notice) {
      throw ApiError.notFound("Notice not found");
    }

    // Teachers can only edit their own notices
    if (user.role === ROLES.TEACHER && notice.createdBy?.toString() !== currentUserId?.toString()) {
      throw ApiError.forbidden("Teachers can only modify notices they created.");
    }

    const before = notice.toJSON();

    if (updateData.title !== undefined) notice.title = updateData.title.trim();
    if (updateData.body !== undefined) notice.body = updateData.body.trim();
    if (updateData.roles !== undefined) notice.audience.roles = updateData.roles;
    if (updateData.classIds !== undefined) notice.audience.classIds = updateData.classIds;
    if (updateData.sectionIds !== undefined) notice.audience.sectionIds = updateData.sectionIds;
    if (updateData.publishedAt !== undefined) notice.publishedAt = new Date(updateData.publishedAt);
    if (updateData.expiresAt !== undefined) {
      notice.expiresAt = updateData.expiresAt ? new Date(updateData.expiresAt) : null;
    }
    if (updateData.status !== undefined) notice.status = updateData.status;
    if (updateData.isPinned !== undefined) notice.isPinned = updateData.isPinned;
    if (updateData.attachmentUrl !== undefined)
      notice.attachmentUrl = updateData.attachmentUrl.trim();

    await notice.save();

    await logAuditEvent({
      actorId: currentUserId,
      actorRole: user.role,
      action: "NOTICE_UPDATED",
      entityType: "Notice",
      entityId: notice._id,
      before,
      after: notice.toJSON(),
      ip,
    });

    return Notice.findById(notice._id)
      .populate("createdBy", "name role")
      .populate("audience.classIds", "name")
      .populate("audience.sectionIds", "name");
  }

  /**
   * Delete notice
   */
  static async deleteNotice({ schoolId, noticeId, user, ip }) {
    const currentUserId = user.userId || user._id || user.sub;
    const notice = await Notice.findOne({ _id: noticeId, schoolId });
    if (!notice) {
      throw ApiError.notFound("Notice not found");
    }

    // Teachers can only delete their own notices
    if (user.role === ROLES.TEACHER && notice.createdBy?.toString() !== currentUserId?.toString()) {
      throw ApiError.forbidden("Teachers can only delete notices they created.");
    }

    const before = notice.toJSON();
    await Notice.deleteOne({ _id: noticeId });

    await logAuditEvent({
      actorId: currentUserId,
      actorRole: user.role,
      action: "NOTICE_DELETED",
      entityType: "Notice",
      entityId: noticeId,
      before,
      ip,
    });

    return { message: "Notice deleted successfully" };
  }
}

import { AcademicYear } from "./academic-year.model.js";
import { Class } from "./class.model.js";
import { Section } from "./section.model.js";
import { Subject } from "./subject.model.js";
import { TeachingAssignment } from "./teaching-assignment.model.js";
import { ApiError } from "../../utils/api-error.js";
import { logAuditEvent } from "../../utils/audit.js";

export class AcademicService {
  // ─── Academic Years ────────────────────────────────────────────────────────
  static async listYears(schoolId) {
    return AcademicYear.find({ schoolId }).sort({ startDate: -1 }).lean();
  }

  static async getCurrentYear(schoolId) {
    let current = await AcademicYear.findOne({ schoolId, isCurrent: true }).lean();
    if (!current) {
      current = await AcademicYear.findOne({ schoolId }).sort({ startDate: -1 }).lean();
    }
    return current;
  }

  static async createYear({
    schoolId,
    name,
    startDate,
    endDate,
    isCurrent = false,
    terms = [],
    actorId,
    actorRole,
    ip,
  }) {
    const existing = await AcademicYear.findOne({ schoolId, name });
    if (existing) {
      throw ApiError.conflict(`Academic year "${name}" already exists`);
    }

    if (isCurrent) {
      await AcademicYear.updateMany({ schoolId }, { isCurrent: false });
    }

    const year = await AcademicYear.create({
      schoolId,
      name,
      startDate,
      endDate,
      isCurrent,
      terms,
    });

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "ACADEMIC_YEAR_CREATE",
      entityType: "AcademicYear",
      entityId: year._id,
      after: { name, startDate, endDate, isCurrent },
      ip,
    });

    return year.toJSON();
  }

  static async updateYear({
    id,
    schoolId,
    name,
    startDate,
    endDate,
    isCurrent,
    terms,
    actorId,
    actorRole,
    ip,
  }) {
    const year = await AcademicYear.findOne({ _id: id, schoolId });
    if (!year) {
      throw ApiError.notFound("Academic year not found");
    }

    if (name && name !== year.name) {
      const existing = await AcademicYear.findOne({ schoolId, name });
      if (existing) throw ApiError.conflict(`Academic year "${name}" already exists`);
      year.name = name;
    }

    if (isCurrent !== undefined && isCurrent) {
      await AcademicYear.updateMany({ schoolId, _id: { $ne: id } }, { isCurrent: false });
      year.isCurrent = true;
    } else if (isCurrent !== undefined) {
      year.isCurrent = isCurrent;
    }

    if (startDate) year.startDate = startDate;
    if (endDate) year.endDate = endDate;
    if (terms) year.terms = terms;

    await year.save();

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "ACADEMIC_YEAR_UPDATE",
      entityType: "AcademicYear",
      entityId: year._id,
      after: { name: year.name, isCurrent: year.isCurrent },
      ip,
    });

    return year.toJSON();
  }

  // ─── Classes & Sections ───────────────────────────────────────────────────
  static async listClasses(schoolId) {
    const classes = await Class.find({ schoolId }).sort({ order: 1, name: 1 }).lean();
    const classIds = classes.map((c) => c._id);

    const sections = await Section.find({ classId: { $in: classIds } })
      .populate("classTeacherId", "email phone role")
      .sort({ name: 1 })
      .lean();

    const sectionsByClass = {};
    for (const sec of sections) {
      const cId = sec.classId.toString();
      if (!sectionsByClass[cId]) sectionsByClass[cId] = [];
      sectionsByClass[cId].push(sec);
    }

    return classes.map((c) => ({
      ...c,
      sections: sectionsByClass[c._id.toString()] || [],
    }));
  }

  static async createClass({ schoolId, name, order = 1, actorId, actorRole, ip }) {
    const existing = await Class.findOne({ schoolId, name });
    if (existing) {
      throw ApiError.conflict(`Class "${name}" already exists`);
    }

    const cls = await Class.create({ schoolId, name, order });

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "CLASS_CREATE",
      entityType: "Class",
      entityId: cls._id,
      after: { name, order },
      ip,
    });

    return cls.toJSON();
  }

  static async updateClass({ id, schoolId, name, order, actorId, actorRole, ip }) {
    const cls = await Class.findOne({ _id: id, schoolId });
    if (!cls) throw ApiError.notFound("Class not found");

    if (name && name !== cls.name) {
      const existing = await Class.findOne({ schoolId, name });
      if (existing) throw ApiError.conflict(`Class "${name}" already exists`);
      cls.name = name;
    }
    if (order !== undefined) cls.order = order;

    await cls.save();

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "CLASS_UPDATE",
      entityType: "Class",
      entityId: cls._id,
      after: { name: cls.name, order: cls.order },
      ip,
    });

    return cls.toJSON();
  }

  static async deleteClass({ id, schoolId, actorId, actorRole, ip }) {
    const cls = await Class.findOne({ _id: id, schoolId });
    if (!cls) throw ApiError.notFound("Class not found");

    const sectionsCount = await Section.countDocuments({ classId: id });
    if (sectionsCount > 0) {
      throw ApiError.conflict(
        `Cannot delete class "${cls.name}" because it contains ${sectionsCount} section(s). Delete sections first.`
      );
    }

    await Class.deleteOne({ _id: id });

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "CLASS_DELETE",
      entityType: "Class",
      entityId: id,
      before: { name: cls.name },
      ip,
    });

    return { message: `Class "${cls.name}" deleted successfully` };
  }

  static async listSections(schoolId, classId) {
    const filter = { schoolId };
    if (classId) filter.classId = classId;
    return Section.find(filter)
      .populate("classId", "name order")
      .populate("classTeacherId", "email phone role")
      .sort({ name: 1 })
      .lean();
  }

  static async createSection({
    schoolId,
    classId,
    name,
    classTeacherId = null,
    capacity = 40,
    actorId,
    actorRole,
    ip,
  }) {
    const cls = await Class.findOne({ _id: classId, schoolId });
    if (!cls) throw ApiError.notFound("Parent class not found");

    const existing = await Section.findOne({ classId, name: name.toUpperCase() });
    if (existing) {
      throw ApiError.conflict(`Section "${name}" already exists in class "${cls.name}"`);
    }

    const section = await Section.create({
      schoolId,
      classId,
      name: name.toUpperCase(),
      classTeacherId: classTeacherId || null,
      capacity,
    });

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "SECTION_CREATE",
      entityType: "Section",
      entityId: section._id,
      after: { name: section.name, classId, capacity },
      ip,
    });

    return section.toJSON();
  }

  static async updateSection({
    id,
    schoolId,
    name,
    classTeacherId,
    capacity,
    actorId,
    actorRole,
    ip,
  }) {
    const section = await Section.findOne({ _id: id, schoolId });
    if (!section) throw ApiError.notFound("Section not found");

    if (name && name.toUpperCase() !== section.name) {
      const existing = await Section.findOne({
        classId: section.classId,
        name: name.toUpperCase(),
      });
      if (existing) throw ApiError.conflict(`Section "${name}" already exists in this class`);
      section.name = name.toUpperCase();
    }

    if (classTeacherId !== undefined) section.classTeacherId = classTeacherId || null;
    if (capacity !== undefined) section.capacity = capacity;

    await section.save();

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "SECTION_UPDATE",
      entityType: "Section",
      entityId: section._id,
      after: { name: section.name, capacity: section.capacity },
      ip,
    });

    return section.toJSON();
  }

  static async deleteSection({ id, schoolId, actorId, actorRole, ip }) {
    const section = await Section.findOne({ _id: id, schoolId });
    if (!section) throw ApiError.notFound("Section not found");

    await Section.deleteOne({ _id: id });

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "SECTION_DELETE",
      entityType: "Section",
      entityId: id,
      before: { name: section.name },
      ip,
    });

    return { message: `Section "${section.name}" deleted successfully` };
  }

  // ─── Subjects ─────────────────────────────────────────────────────────────
  static async listSubjects(schoolId) {
    return Subject.find({ schoolId }).sort({ code: 1, name: 1 }).lean();
  }

  static async createSubject({ schoolId, name, code, actorId, actorRole, ip }) {
    const upperCode = code.trim().toUpperCase();
    const existing = await Subject.findOne({ schoolId, code: upperCode });
    if (existing) {
      throw ApiError.conflict(`Subject with code "${upperCode}" already exists`);
    }

    const subject = await Subject.create({
      schoolId,
      name,
      code: upperCode,
    });

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "SUBJECT_CREATE",
      entityType: "Subject",
      entityId: subject._id,
      after: { name, code: upperCode },
      ip,
    });

    return subject.toJSON();
  }

  static async updateSubject({ id, schoolId, name, code, actorId, actorRole, ip }) {
    const subject = await Subject.findOne({ _id: id, schoolId });
    if (!subject) throw ApiError.notFound("Subject not found");

    if (code && code.trim().toUpperCase() !== subject.code) {
      const upperCode = code.trim().toUpperCase();
      const existing = await Subject.findOne({ schoolId, code: upperCode });
      if (existing) throw ApiError.conflict(`Subject with code "${upperCode}" already exists`);
      subject.code = upperCode;
    }
    if (name) subject.name = name;

    await subject.save();

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "SUBJECT_UPDATE",
      entityType: "Subject",
      entityId: subject._id,
      after: { name: subject.name, code: subject.code },
      ip,
    });

    return subject.toJSON();
  }

  static async deleteSubject({ id, schoolId, actorId, actorRole, ip }) {
    const subject = await Subject.findOne({ _id: id, schoolId });
    if (!subject) throw ApiError.notFound("Subject not found");

    await Subject.deleteOne({ _id: id });

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "SUBJECT_DELETE",
      entityType: "Subject",
      entityId: id,
      before: { name: subject.name, code: subject.code },
      ip,
    });

    return { message: `Subject "${subject.name}" deleted successfully` };
  }

  // ─── Teaching Assignments ─────────────────────────────────────────────────
  static async listAssignments(schoolId, { academicYearId, sectionId, staffId } = {}) {
    const filter = { schoolId };
    if (academicYearId) filter.academicYearId = academicYearId;
    if (sectionId) filter.sectionId = sectionId;
    if (staffId) filter.staffId = staffId;

    return TeachingAssignment.find(filter)
      .populate("academicYearId", "name isCurrent")
      .populate("sectionId", "name classId")
      .populate("subjectId", "name code")
      .populate("staffId", "email phone role")
      .lean();
  }

  static async createAssignment({
    schoolId,
    academicYearId,
    sectionId,
    subjectId,
    staffId,
    actorId,
    actorRole,
    ip,
  }) {
    const existing = await TeachingAssignment.findOne({
      academicYearId,
      sectionId,
      subjectId,
    });
    if (existing) {
      throw ApiError.conflict("A teaching assignment already exists for this section and subject");
    }

    const assignment = await TeachingAssignment.create({
      schoolId,
      academicYearId,
      sectionId,
      subjectId,
      staffId,
    });

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "TEACHING_ASSIGNMENT_CREATE",
      entityType: "TeachingAssignment",
      entityId: assignment._id,
      after: { academicYearId, sectionId, subjectId, staffId },
      ip,
    });

    return assignment.toJSON();
  }

  static async deleteAssignment({ id, schoolId, actorId, actorRole, ip }) {
    const assignment = await TeachingAssignment.findOne({ _id: id, schoolId });
    if (!assignment) throw ApiError.notFound("Teaching assignment not found");

    await TeachingAssignment.deleteOne({ _id: id });

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "TEACHING_ASSIGNMENT_DELETE",
      entityType: "TeachingAssignment",
      entityId: id,
      ip,
    });

    return { message: "Teaching assignment removed successfully" };
  }
}

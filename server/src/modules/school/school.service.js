import { School } from "./school.model.js";
import { ApiError } from "../../utils/api-error.js";
import { logAuditEvent } from "../../utils/audit.js";

export class SchoolService {
  static async getSchool(schoolId) {
    const school = await School.findById(schoolId).lean();
    if (!school) {
      throw ApiError.notFound("School record not found");
    }
    return school;
  }

  static async updateSchool({ schoolId, updates, actorId, actorRole, ip }) {
    const school = await School.findById(schoolId);
    if (!school) {
      throw ApiError.notFound("School record not found");
    }

    const before = {
      name: school.name,
      settings: { ...school.settings },
    };

    if (updates.name) school.name = updates.name;
    if (updates.address !== undefined) school.address = updates.address;
    if (updates.phone !== undefined) school.phone = updates.phone;
    if (updates.logoUrl !== undefined) school.logoUrl = updates.logoUrl;

    if (updates.settings) {
      school.settings = {
        ...school.settings,
        ...updates.settings,
      };
    }

    await school.save();

    await logAuditEvent({
      schoolId: school._id,
      actorId,
      actorRole,
      action: "SCHOOL_SETTINGS_UPDATE",
      entityType: "School",
      entityId: school._id,
      before,
      after: {
        name: school.name,
        settings: school.settings,
      },
      ip,
    });

    return school.toJSON();
  }
}

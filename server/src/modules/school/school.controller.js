import { SchoolService } from "./school.service.js";

export class SchoolController {
  static async getSchool(req, res) {
    const school = await SchoolService.getSchool(req.user.schoolId);
    res.status(200).json({ success: true, data: school });
  }

  static async updateSchool(req, res) {
    const school = await SchoolService.updateSchool({
      schoolId: req.user.schoolId,
      updates: req.body,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
    });
    res.status(200).json({ success: true, data: school });
  }
}

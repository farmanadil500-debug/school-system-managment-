import { StaffService } from "./staff.service.js";

export class StaffController {
  static async listStaff(req, res) {
    const { staffType, status, q, page, limit } = req.query;
    const { staff, meta } = await StaffService.listStaff({
      schoolId: req.user.schoolId,
      staffType,
      status,
      q,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data: staff,
      meta,
    });
  }

  static async createStaff(req, res) {
    const staff = await StaffService.createStaff({
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
      ...req.body,
    });

    res.status(201).json({
      success: true,
      data: staff,
    });
  }

  static async getStaffById(req, res) {
    const staff = await StaffService.getStaffById(req.params.id, req.user.schoolId);
    res.status(200).json({
      success: true,
      data: staff,
    });
  }

  static async updateStaff(req, res) {
    const staff = await StaffService.updateStaff({
      id: req.params.id,
      schoolId: req.user.schoolId,
      updates: req.body,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
    });

    res.status(200).json({
      success: true,
      data: staff,
    });
  }

  static async deleteStaff(req, res) {
    const result = await StaffService.deleteStaff({
      id: req.params.id,
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  }
}

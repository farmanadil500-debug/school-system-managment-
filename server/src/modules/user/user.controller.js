import { UserService } from "./user.service.js";

export class UserController {
  static async listUsers(req, res) {
    const { page, limit, role, status, q } = req.query;
    const { users, meta } = await UserService.listUsers({
      schoolId: req.user.schoolId,
      page,
      limit,
      role,
      status,
      q,
    });

    res.status(200).json({
      success: true,
      data: users,
      meta,
    });
  }

  static async createUser(req, res) {
    const { email, phone, password, role, staffId, guardianId, studentId } = req.body;
    const ip = req.ip || req.socket.remoteAddress || "";

    const user = await UserService.createUser({
      schoolId: req.user.schoolId,
      email,
      phone,
      password,
      role,
      staffId,
      guardianId,
      studentId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip,
    });

    res.status(201).json({
      success: true,
      data: user,
    });
  }

  static async getUserById(req, res) {
    const user = await UserService.getUserById(req.params.id, req.user.schoolId);

    res.status(200).json({
      success: true,
      data: user,
    });
  }

  static async updateUser(req, res) {
    const { role, status } = req.body;
    const ip = req.ip || req.socket.remoteAddress || "";

    const user = await UserService.updateUser({
      id: req.params.id,
      schoolId: req.user.schoolId,
      role,
      status,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip,
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  }

  static async resetPassword(req, res) {
    const { newPassword } = req.body;
    const ip = req.ip || req.socket.remoteAddress || "";

    const result = await UserService.resetPassword({
      id: req.params.id,
      schoolId: req.user.schoolId,
      newPassword,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  }
}

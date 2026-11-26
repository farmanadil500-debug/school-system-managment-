import { AttendanceService } from "./attendance.service.js";

export class AttendanceController {
  static async markSectionAttendance(req, res) {
    const result = await AttendanceService.markSectionAttendance({
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
      ...req.body,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  static async getSectionAttendance(req, res) {
    const result = await AttendanceService.getSectionAttendance({
      schoolId: req.user.schoolId,
      sectionId: req.query.sectionId,
      date: req.query.date,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  static async getAttendanceHistory(req, res) {
    const history = await AttendanceService.getAttendanceHistory({
      schoolId: req.user.schoolId,
      sectionId: req.query.sectionId,
      classId: req.query.classId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: history,
    });
  }

  static async getStudentAttendance(req, res) {
    const result = await AttendanceService.getStudentAttendance({
      schoolId: req.user.schoolId,
      studentId: req.params.studentId,
      month: req.query.month,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  static async getLowAttendanceList(req, res) {
    const result = await AttendanceService.getLowAttendanceList({
      schoolId: req.user.schoolId,
      sectionId: req.query.sectionId,
      threshold: req.query.threshold,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  }
}

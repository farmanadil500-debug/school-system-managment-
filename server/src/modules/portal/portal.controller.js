import { PortalService } from "./portal.service.js";

export class PortalController {
  static async getMyChildren(req, res) {
    const result = await PortalService.getMyChildren({
      user: req.user,
      schoolId: req.user.schoolId,
    });
    return res.status(200).json({ success: true, data: result });
  }

  static async getStudentProfile(req, res) {
    const result = await PortalService.getStudentProfile({
      user: req.user,
      studentId: req.params.studentId,
      schoolId: req.user.schoolId,
    });
    return res.status(200).json({ success: true, data: result });
  }

  static async getStudentAttendance(req, res) {
    const result = await PortalService.getStudentAttendance({
      user: req.user,
      studentId: req.params.studentId,
      schoolId: req.user.schoolId,
      month: req.query.month,
    });
    return res.status(200).json({ success: true, data: result });
  }

  static async getStudentFees(req, res) {
    const result = await PortalService.getStudentFees({
      user: req.user,
      studentId: req.params.studentId,
      schoolId: req.user.schoolId,
      status: req.query.status,
      period: req.query.period,
    });
    return res.status(200).json({ success: true, data: result });
  }

  static async getStudentTimetable(req, res) {
    const result = await PortalService.getStudentTimetable({
      user: req.user,
      studentId: req.params.studentId,
      schoolId: req.user.schoolId,
    });
    return res.status(200).json({ success: true, data: result });
  }

  static async getStudentExams(req, res) {
    const result = await PortalService.getStudentExams({
      user: req.user,
      studentId: req.params.studentId,
      schoolId: req.user.schoolId,
    });
    return res.status(200).json({ success: true, data: result });
  }

  static async getStudentNotices(req, res) {
    const result = await PortalService.getStudentNotices({
      user: req.user,
      studentId: req.params.studentId,
      schoolId: req.user.schoolId,
    });
    return res.status(200).json({ success: true, data: result });
  }
}

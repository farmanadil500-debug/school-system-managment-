import { TimetableService } from "./timetable.service.js";

export class TimetableController {
  /**
   * GET /api/v1/timetables/section/:sectionId
   */
  static async getSectionTimetable(req, res) {
    const { sectionId } = req.params;
    const { academicYearId, day } = req.query;

    const slots = await TimetableService.getSectionTimetable({
      schoolId: req.user.schoolId,
      sectionId,
      academicYearId,
      day,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: slots,
    });
  }

  /**
   * GET /api/v1/timetables/teacher/:staffId
   */
  static async getTeacherTimetable(req, res) {
    const { staffId } = req.params;
    const { academicYearId, day } = req.query;

    const slots = await TimetableService.getTeacherTimetable({
      schoolId: req.user.schoolId,
      staffId,
      academicYearId,
      day,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: slots,
    });
  }

  /**
   * POST /api/v1/timetables/slots
   */
  static async createSlot(req, res) {
    const slot = await TimetableService.createSlot({
      schoolId: req.user.schoolId,
      ...req.body,
      actorId: req.user._id,
      actorRole: req.user.role,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: slot,
    });
  }

  /**
   * PATCH /api/v1/timetables/slots/:id
   */
  static async updateSlot(req, res) {
    const slot = await TimetableService.updateSlot({
      schoolId: req.user.schoolId,
      slotId: req.params.id,
      updateData: req.body,
      actorId: req.user._id,
      actorRole: req.user.role,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      data: slot,
    });
  }

  /**
   * POST /api/v1/timetables/bulk
   */
  static async bulkSaveSectionTimetable(req, res) {
    const slots = await TimetableService.bulkSaveSectionTimetable({
      schoolId: req.user.schoolId,
      ...req.body,
      actorId: req.user._id,
      actorRole: req.user.role,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      data: slots,
    });
  }

  /**
   * DELETE /api/v1/timetables/slots/:id
   */
  static async deleteSlot(req, res) {
    const result = await TimetableService.deleteSlot({
      schoolId: req.user.schoolId,
      slotId: req.params.id,
      actorId: req.user._id,
      actorRole: req.user.role,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  }
}

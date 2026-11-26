import { NoticeService } from "./notice.service.js";

export class NoticeController {
  /**
   * GET /api/v1/notices
   */
  static async getNotices(req, res) {
    const { page, limit, status, q, role, classId } = req.query;

    const result = await NoticeService.getNotices({
      schoolId: req.user.schoolId,
      page,
      limit,
      status,
      q,
      role,
      classId,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: result.notices,
      meta: result.meta,
    });
  }

  /**
   * GET /api/v1/notices/:id
   */
  static async getNoticeById(req, res) {
    const notice = await NoticeService.getNoticeById({
      schoolId: req.user.schoolId,
      noticeId: req.params.id,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: notice,
    });
  }

  /**
   * POST /api/v1/notices
   */
  static async createNotice(req, res) {
    const notice = await NoticeService.createNotice({
      schoolId: req.user.schoolId,
      data: req.body,
      user: req.user,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: notice,
    });
  }

  /**
   * PATCH /api/v1/notices/:id
   */
  static async updateNotice(req, res) {
    const notice = await NoticeService.updateNotice({
      schoolId: req.user.schoolId,
      noticeId: req.params.id,
      updateData: req.body,
      user: req.user,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      data: notice,
    });
  }

  /**
   * DELETE /api/v1/notices/:id
   */
  static async deleteNotice(req, res) {
    const result = await NoticeService.deleteNotice({
      schoolId: req.user.schoolId,
      noticeId: req.params.id,
      user: req.user,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  }
}

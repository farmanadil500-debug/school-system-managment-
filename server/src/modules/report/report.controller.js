import { ReportService } from "./report.service.js";

export class ReportController {
  /**
   * GET /api/v1/dashboard/stats
   */
  static async getDashboardStats(req, res) {
    const data = await ReportService.getDashboardStats({
      schoolId: req.user.schoolId,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data,
    });
  }

  /**
   * GET /api/v1/reports/attendance
   */
  static async getAttendanceReport(req, res) {
    const data = await ReportService.getAttendanceReport({
      schoolId: req.user.schoolId,
      academicYearId: req.query.academicYearId,
      classId: req.query.classId,
      sectionId: req.query.sectionId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data,
    });
  }

  /**
   * GET /api/v1/reports/attendance/export/csv
   */
  static async exportAttendanceReportCSV(req, res) {
    const csvData = await ReportService.exportAttendanceReportCSV({
      schoolId: req.user.schoolId,
      academicYearId: req.query.academicYearId,
      classId: req.query.classId,
      sectionId: req.query.sectionId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      user: req.user,
    });

    const filename = `attendance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(csvData);
  }

  /**
   * GET /api/v1/reports/fees
   */
  static async getFeeReport(req, res) {
    const data = await ReportService.getFeeReport({
      schoolId: req.user.schoolId,
      academicYearId: req.query.academicYearId,
      classId: req.query.classId,
      period: req.query.period,
      status: req.query.status,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data,
    });
  }

  /**
   * GET /api/v1/reports/fees/export/csv
   */
  static async exportFeeReportCSV(req, res) {
    const csvData = await ReportService.exportFeeReportCSV({
      schoolId: req.user.schoolId,
      academicYearId: req.query.academicYearId,
      classId: req.query.classId,
      period: req.query.period,
      status: req.query.status,
      user: req.user,
    });

    const filename = `fees-revenue-report-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(csvData);
  }

  /**
   * GET /api/v1/reports/exams
   */
  static async getExamReport(req, res) {
    const data = await ReportService.getExamReport({
      schoolId: req.user.schoolId,
      examId: req.query.examId,
      classId: req.query.classId,
      sectionId: req.query.sectionId,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data,
    });
  }

  /**
   * GET /api/v1/reports/exams/export/csv
   */
  static async exportExamReportCSV(req, res) {
    const csvData = await ReportService.exportExamReportCSV({
      schoolId: req.user.schoolId,
      examId: req.query.examId,
      classId: req.query.classId,
      sectionId: req.query.sectionId,
      user: req.user,
    });

    const filename = `exam-results-report-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(csvData);
  }
}

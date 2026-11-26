import { ExamService } from "./exam.service.js";

export class ExamController {
  static async createExam(req, res) {
    const exam = await ExamService.createExam({
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
      ...req.body,
    });

    res.status(201).json({
      success: true,
      data: exam,
    });
  }

  static async getExams(req, res) {
    const exams = await ExamService.getExams({
      schoolId: req.user.schoolId,
      academicYearId: req.query.academicYearId,
      status: req.query.status,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: exams,
    });
  }

  static async getExamById(req, res) {
    const exam = await ExamService.getExamById(req.params.id, req.user.schoolId);
    res.status(200).json({
      success: true,
      data: exam,
    });
  }

  static async updateExam(req, res) {
    const exam = await ExamService.updateExam({
      id: req.params.id,
      schoolId: req.user.schoolId,
      updates: req.body,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
    });

    res.status(200).json({
      success: true,
      data: exam,
    });
  }

  static async addExamSubject(req, res) {
    const examSubject = await ExamService.addOrUpdateExamSubject({
      examId: req.params.id,
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
      ...req.body,
    });

    res.status(201).json({
      success: true,
      data: examSubject,
    });
  }

  static async enterMarks(req, res) {
    const result = await ExamService.enterMarks({
      examId: req.params.id,
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

  static async getSectionMarks(req, res) {
    const result = await ExamService.getSectionMarks({
      examId: req.params.id,
      schoolId: req.user.schoolId,
      subjectId: req.params.subjectId,
      sectionId: req.params.sectionId,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  static async getStudentReportCard(req, res) {
    const reportCard = await ExamService.getStudentReportCard({
      examId: req.params.id,
      schoolId: req.user.schoolId,
      studentId: req.params.studentId,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: reportCard,
    });
  }
}

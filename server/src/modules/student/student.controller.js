import { StudentService } from "./student.service.js";

export class StudentController {
  static async listStudents(req, res) {
    const { academicYearId, classId, sectionId, status, q, page, limit } = req.query;
    const { students, meta } = await StudentService.listStudents({
      schoolId: req.user.schoolId,
      academicYearId,
      classId,
      sectionId,
      status,
      q,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data: students,
      meta,
    });
  }

  static async admitStudent(req, res) {
    const result = await StudentService.admitStudent({
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
      ...req.body,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  }

  static async getStudentById(req, res) {
    const student = await StudentService.getStudentById(req.params.id, req.user.schoolId);
    res.status(200).json({
      success: true,
      data: student,
    });
  }

  static async updateStudent(req, res) {
    const student = await StudentService.updateStudent({
      id: req.params.id,
      schoolId: req.user.schoolId,
      updates: req.body,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
    });

    res.status(200).json({
      success: true,
      data: student,
    });
  }

  static async promoteStudents(req, res) {
    const { studentIds, targetAcademicYearId, targetClassId, targetSectionId, outcome } = req.body;
    const result = await StudentService.promoteStudents({
      schoolId: req.user.schoolId,
      studentIds,
      targetAcademicYearId,
      targetClassId,
      targetSectionId,
      outcome,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  static async exportCSV(req, res) {
    const { academicYearId, classId, sectionId } = req.query;
    const csvContent = await StudentService.exportStudentsCSV({
      schoolId: req.user.schoolId,
      academicYearId,
      classId,
      sectionId,
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="students_roster.csv"');
    res.status(200).send(csvContent);
  }
}

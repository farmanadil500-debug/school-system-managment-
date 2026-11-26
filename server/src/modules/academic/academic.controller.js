import { AcademicService } from "./academic.service.js";

export class AcademicController {
  // Years
  static async listYears(req, res) {
    const years = await AcademicService.listYears(req.user.schoolId);
    res.status(200).json({ success: true, data: years });
  }

  static async getCurrentYear(req, res) {
    const current = await AcademicService.getCurrentYear(req.user.schoolId);
    res.status(200).json({ success: true, data: current });
  }

  static async createYear(req, res) {
    const year = await AcademicService.createYear({
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
      ...req.body,
    });
    res.status(201).json({ success: true, data: year });
  }

  static async updateYear(req, res) {
    const year = await AcademicService.updateYear({
      id: req.params.id,
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
      ...req.body,
    });
    res.status(200).json({ success: true, data: year });
  }

  // Classes & Sections
  static async listClasses(req, res) {
    const classes = await AcademicService.listClasses(req.user.schoolId);
    res.status(200).json({ success: true, data: classes });
  }

  static async createClass(req, res) {
    const cls = await AcademicService.createClass({
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
      ...req.body,
    });
    res.status(201).json({ success: true, data: cls });
  }

  static async updateClass(req, res) {
    const cls = await AcademicService.updateClass({
      id: req.params.id,
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
      ...req.body,
    });
    res.status(200).json({ success: true, data: cls });
  }

  static async deleteClass(req, res) {
    const result = await AcademicService.deleteClass({
      id: req.params.id,
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
    });
    res.status(200).json({ success: true, data: result });
  }

  static async createSection(req, res) {
    const section = await AcademicService.createSection({
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
      ...req.body,
    });
    res.status(201).json({ success: true, data: section });
  }

  static async updateSection(req, res) {
    const section = await AcademicService.updateSection({
      id: req.params.id,
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
      ...req.body,
    });
    res.status(200).json({ success: true, data: section });
  }

  static async deleteSection(req, res) {
    const result = await AcademicService.deleteSection({
      id: req.params.id,
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
    });
    res.status(200).json({ success: true, data: result });
  }

  // Subjects
  static async listSubjects(req, res) {
    const subjects = await AcademicService.listSubjects(req.user.schoolId);
    res.status(200).json({ success: true, data: subjects });
  }

  static async createSubject(req, res) {
    const subject = await AcademicService.createSubject({
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
      ...req.body,
    });
    res.status(201).json({ success: true, data: subject });
  }

  static async updateSubject(req, res) {
    const subject = await AcademicService.updateSubject({
      id: req.params.id,
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
      ...req.body,
    });
    res.status(200).json({ success: true, data: subject });
  }

  static async deleteSubject(req, res) {
    const result = await AcademicService.deleteSubject({
      id: req.params.id,
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
    });
    res.status(200).json({ success: true, data: result });
  }

  // Assignments
  static async listAssignments(req, res) {
    const assignments = await AcademicService.listAssignments(req.user.schoolId, req.query);
    res.status(200).json({ success: true, data: assignments });
  }

  static async createAssignment(req, res) {
    const assignment = await AcademicService.createAssignment({
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
      ...req.body,
    });
    res.status(201).json({ success: true, data: assignment });
  }

  static async deleteAssignment(req, res) {
    const result = await AcademicService.deleteAssignment({
      id: req.params.id,
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
    });
    res.status(200).json({ success: true, data: result });
  }
}

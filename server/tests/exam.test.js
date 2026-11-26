import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { signAccessToken } from "../src/utils/tokens.js";
import { ROLES } from "../src/constants/index.js";
import { Exam } from "../src/modules/exam/exam.model.js";
import { ExamSubject } from "../src/modules/exam/exam-subject.model.js";
import { Mark } from "../src/modules/exam/mark.model.js";
import { AcademicYear } from "../src/modules/academic/academic-year.model.js";
import { Section } from "../src/modules/academic/section.model.js";
import { Subject } from "../src/modules/academic/subject.model.js";
import { TeachingAssignment } from "../src/modules/academic/teaching-assignment.model.js";
import { Enrollment } from "../src/modules/student/enrollment.model.js";
import { Student } from "../src/modules/student/student.model.js";
import { User } from "../src/modules/user/user.model.js";

describe("Unit 7: Exams & Results API", () => {
  const schoolId = "60d5ec49f1b2c8b1f8e4e1a2";
  const academicYearId = "60d5ec49f1b2c8b1f8e4e1a5";
  const classId = "60d5ec49f1b2c8b1f8e4e1a3";
  const sectionId = "60d5ec49f1b2c8b1f8e4e1a4";
  const subjectId = "60d5ec49f1b2c8b1f8e4e1a6";
  const examId = "60d5ec49f1b2c8b1f8e4e1f1";
  const studentId = "60d5ec49f1b2c8b1f8e4e1c1";
  const teacherUserId = "60d5ec49f1b2c8b1f8e4e1b1";

  const createToken = (role, userId = "60d5ec49f1b2c8b1f8e4e1a1") =>
    signAccessToken({
      sub: userId,
      role,
      schoolId,
    });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication & RBAC Security", () => {
    it("should return 401 when accessing exam endpoints unauthenticated", async () => {
      const res = await request(app).get("/api/v1/exams");
      expect(res.status).toBe(401);
    });

    it("should return 403 when a teacher attempts to create an exam", async () => {
      const teacherToken = createToken(ROLES.TEACHER);
      const res = await request(app)
        .post("/api/v1/exams")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ name: "Mid-Term", termName: "Term 1" });

      expect(res.status).toBe(403);
    });

    it("should return 403 when a student attempts to view report card of an unpublished exam", async () => {
      const studentToken = createToken(ROLES.STUDENT, studentId);

      vi.spyOn(Exam, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: examId,
          schoolId,
          name: "Mid-Term",
          status: "marking", // Not published!
        }),
      });

      const res = await request(app)
        .get(`/api/v1/exams/${examId}/students/${studentId}/report-card`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain("not been published");
    });
  });

  describe("POST /api/v1/exams (Exam Creation)", () => {
    it("should return 201 when admin creates an exam session", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(AcademicYear, "findOne").mockResolvedValue({
        _id: academicYearId,
        isCurrent: true,
      });

      vi.spyOn(Exam, "create").mockResolvedValue({
        _id: examId,
        schoolId,
        academicYearId,
        name: "Final Examination 2026",
        termName: "Term 2",
        classIds: [classId],
        status: "scheduled",
      });

      const res = await request(app)
        .post("/api/v1/exams")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Final Examination 2026",
          termName: "Term 2",
          classIds: [classId],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Final Examination 2026");
    });
  });

  describe("POST /api/v1/exams/:id/subjects (Exam Subject Schedule)", () => {
    it("should return 201 when scheduling a subject with total and passing marks", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(Exam, "findOne").mockResolvedValue({
        _id: examId,
        schoolId,
        status: "scheduled",
      });

      vi.spyOn(ExamSubject, "findOneAndUpdate").mockResolvedValue({
        _id: "exam-subject-1",
        examId,
        classId,
        subjectId,
        totalMarks: 100,
        passingMarks: 33,
      });

      const res = await request(app)
        .post(`/api/v1/exams/${examId}/subjects`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          classId,
          subjectId,
          totalMarks: 100,
          passingMarks: 33,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalMarks).toBe(100);
      expect(res.body.data.passingMarks).toBe(33);
    });
  });

  describe("POST /api/v1/exams/:id/marks (Marks Entry & Lock Guard)", () => {
    const marksPayload = {
      subjectId,
      sectionId,
      marks: [{ studentId, marksObtained: 85, isAbsent: false }],
    };

    it("should return 403 when marks entry is locked for the exam", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(Exam, "findOne").mockResolvedValue({
        _id: examId,
        schoolId,
        status: "locked", // Locked!
      });

      const res = await request(app)
        .post(`/api/v1/exams/${examId}/marks`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(marksPayload);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain("locked");
    });

    it("should return 403 when a teacher attempts to enter marks for an unassigned subject", async () => {
      const teacherToken = createToken(ROLES.TEACHER, teacherUserId);

      vi.spyOn(Exam, "findOne").mockResolvedValue({
        _id: examId,
        schoolId,
        status: "marking",
      });

      vi.spyOn(User, "findById").mockResolvedValue({
        _id: teacherUserId,
        role: ROLES.TEACHER,
        staffId: teacherUserId,
      });

      // No teaching assignment found
      vi.spyOn(TeachingAssignment, "findOne").mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/v1/exams/${examId}/marks`)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send(marksPayload);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain("not assigned");
    });

    it("should return 400 when marks obtained exceed maximum total marks", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(Exam, "findOne").mockResolvedValue({
        _id: examId,
        schoolId,
        status: "marking",
      });

      vi.spyOn(Section, "findOne").mockResolvedValue({
        _id: sectionId,
        classId,
      });

      vi.spyOn(ExamSubject, "findOne").mockResolvedValue({
        totalMarks: 50, // Max 50
      });

      const res = await request(app)
        .post(`/api/v1/exams/${examId}/marks`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          subjectId,
          sectionId,
          marks: [{ studentId, marksObtained: 75 }], // 75 > 50!
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("cannot exceed total marks");
    });

    it("should return 200 and save marks when valid", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      const mockExam = {
        _id: examId,
        schoolId,
        status: "scheduled",
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Exam, "findOne").mockResolvedValue(mockExam);

      vi.spyOn(Section, "findOne").mockResolvedValue({
        _id: sectionId,
        classId,
      });

      vi.spyOn(ExamSubject, "findOne").mockResolvedValue({
        totalMarks: 100,
      });

      vi.spyOn(Mark, "bulkWrite").mockResolvedValue({ ok: 1 });

      const res = await request(app)
        .post(`/api/v1/exams/${examId}/marks`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(marksPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recordCount).toBe(1);
    });
  });

  describe("GET /api/v1/exams/:id/students/:studentId/report-card (Student Report Card)", () => {
    it("should return 200 with subject results, percentage, grade, and position", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(Exam, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: examId,
          schoolId,
          academicYearId,
          name: "Annual Examination 2026",
          termName: "Final Term",
          status: "published",
        }),
      });

      vi.spyOn(Student, "findOne").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue({
              _id: studentId,
              name: "Bilal Ahmed",
              admissionNo: "ADM-2026-0002",
              guardianId: { name: "Ahmed Raza", phone: "+923001234567" },
            }),
          }),
        }),
      });

      vi.spyOn(Enrollment, "findOne").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue({
              classId: { _id: classId, name: "Grade 5" },
              sectionId: { _id: sectionId, name: "A" },
              rollNo: 12,
            }),
          }),
        }),
      });

      vi.spyOn(ExamSubject, "find").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              subjectId: { _id: subjectId, name: "Mathematics", code: "MATH-5" },
              totalMarks: 100,
              passingMarks: 33,
            },
          ]),
        }),
      });

      vi.spyOn(Mark, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            subjectId,
            marksObtained: 88,
            isAbsent: false,
          },
        ]),
      });

      vi.spyOn(Mark, "aggregate").mockResolvedValue([{ _id: studentId, totalScore: 88 }]);

      const res = await request(app)
        .get(`/api/v1/exams/${examId}/students/${studentId}/report-card`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student.name).toBe("Bilal Ahmed");
      expect(res.body.data.subjects).toHaveLength(1);
      expect(res.body.data.subjects[0].marksObtained).toBe(88);
      expect(res.body.data.summary.percentage).toBe(88);
      expect(res.body.data.summary.grade).toBe("A");
      expect(res.body.data.summary.result).toBe("PASSED");
      expect(res.body.data.summary.position).toBe(1);
    });
  });
});

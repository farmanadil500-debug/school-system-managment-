import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { signAccessToken } from "../src/utils/tokens.js";
import { ROLES } from "../src/constants/index.js";
import { Student } from "../src/modules/student/student.model.js";
import { Guardian } from "../src/modules/student/guardian.model.js";
import { Enrollment } from "../src/modules/student/enrollment.model.js";
import { AcademicYear } from "../src/modules/academic/academic-year.model.js";
import { Class } from "../src/modules/academic/class.model.js";
import { Section } from "../src/modules/academic/section.model.js";
import * as counterModule from "../src/modules/counter/counter.model.js";

describe("Unit 3: Students, Guardians & Enrollments API", () => {
  const schoolId = "60d5ec49f1b2c8b1f8e4e1a2";
  const classId = "60d5ec49f1b2c8b1f8e4e1a3";
  const sectionId = "60d5ec49f1b2c8b1f8e4e1a4";
  const academicYearId = "60d5ec49f1b2c8b1f8e4e1a5";

  const createToken = (role) =>
    signAccessToken({
      sub: "60d5ec49f1b2c8b1f8e4e1a1",
      role,
      schoolId,
    });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/v1/students/admission", () => {
    const validAdmissionPayload = {
      name: "Zainab Bibi",
      dob: "2015-05-12",
      gender: "female",
      classId,
      sectionId,
      guardian: {
        name: "Muhammad Tariq",
        relation: "father",
        phone: "+923001234567",
        email: "tariq@gmail.com",
      },
    };

    it("should return 401 when unauthenticated", async () => {
      const res = await request(app).post("/api/v1/students/admission").send(validAdmissionPayload);
      expect(res.status).toBe(401);
    });

    it("should return 403 when called by a teacher (only admin/super_admin can admit)", async () => {
      const teacherToken = createToken(ROLES.TEACHER);
      const res = await request(app)
        .post("/api/v1/students/admission")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send(validAdmissionPayload);

      expect(res.status).toBe(403);
    });

    it("should return 400 when missing required fields (e.g. guardian name)", async () => {
      const adminToken = createToken(ROLES.ADMIN);
      const invalidPayload = {
        name: "Zainab Bibi",
        dob: "2015-05-12",
        gender: "female",
        classId,
        sectionId,
        guardian: {
          relation: "father",
          phone: "0300",
        },
      };

      const res = await request(app)
        .post("/api/v1/students/admission")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 201 and generate sequential admission number upon successful admission", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(AcademicYear, "findOne").mockResolvedValue({
        _id: academicYearId,
        name: "2026-2027",
        isCurrent: true,
      });

      vi.spyOn(Class, "findOne").mockResolvedValue({
        _id: classId,
        name: "Grade 1",
      });

      vi.spyOn(Section, "findOne").mockResolvedValue({
        _id: sectionId,
        name: "A",
        capacity: 40,
      });

      vi.spyOn(Enrollment, "countDocuments").mockResolvedValue(12);
      vi.spyOn(counterModule, "getNextSequence").mockResolvedValue(1);

      vi.spyOn(Guardian, "findOne").mockResolvedValue(null);
      vi.spyOn(Guardian, "create").mockResolvedValue({
        _id: "guardian-1",
        name: "Muhammad Tariq",
        phone: "+923001234567",
        toJSON: () => ({ _id: "guardian-1", name: "Muhammad Tariq" }),
      });

      vi.spyOn(Student, "create").mockResolvedValue({
        _id: "student-1",
        name: "Zainab Bibi",
        admissionNo: "ADM-2026-0001",
        save: vi.fn().mockResolvedValue(true),
        toJSON: () => ({
          _id: "student-1",
          name: "Zainab Bibi",
          admissionNo: "ADM-2026-0001",
        }),
      });

      vi.spyOn(Enrollment, "create").mockResolvedValue({
        _id: "enrollment-1",
        studentId: "student-1",
        rollNo: 13,
        toJSON: () => ({ _id: "enrollment-1", rollNo: 13 }),
      });

      const res = await request(app)
        .post("/api/v1/students/admission")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validAdmissionPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student.admissionNo).toBe("ADM-2026-0001");
      expect(res.body.data.enrollment.rollNo).toBe(13);
    });
  });

  describe("GET /api/v1/students (Directory listing)", () => {
    it("should return paginated list of students", async () => {
      const teacherToken = createToken(ROLES.TEACHER);

      vi.spyOn(Student, "countDocuments").mockResolvedValue(1);
      vi.spyOn(Student, "find").mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: "student-1",
            admissionNo: "ADM-2026-0001",
            name: "Zainab Bibi",
            status: "active",
            currentEnrollmentId: {
              classId: { name: "Grade 1" },
              sectionId: { name: "A" },
              rollNo: 1,
            },
            guardianIds: [{ name: "Muhammad Tariq", phone: "+923001234567" }],
          },
        ]),
      });

      const res = await request(app)
        .get("/api/v1/students?page=1&limit=20")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].className).toBe("Grade 1");
      expect(res.body.data[0].parentName).toBe("Muhammad Tariq");
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe("GET /api/v1/students/export/csv", () => {
    it("should stream student roster as text/csv", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(Student, "countDocuments").mockResolvedValue(1);
      vi.spyOn(Student, "find").mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            admissionNo: "ADM-2026-0001",
            name: "Zainab Bibi",
            gender: "female",
            status: "active",
            currentEnrollmentId: {
              classId: { name: "Grade 1" },
              sectionId: { name: "A" },
              rollNo: 1,
            },
            guardianIds: [{ name: "Muhammad Tariq", phone: "+923001234567" }],
          },
        ]),
      });

      const res = await request(app)
        .get("/api/v1/students/export/csv")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/csv");
      expect(res.text).toContain("Admission No,Full Name,Gender,Class,Section,Roll No");
      expect(res.text).toContain("ADM-2026-0001");
    });
  });

  describe("POST /api/v1/students/promote", () => {
    it("should promote students to next academic session", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(AcademicYear, "findOne").mockResolvedValue({ _id: "year-next", name: "2027-2028" });
      vi.spyOn(Class, "findOne").mockResolvedValue({ _id: "class-next", name: "Grade 2" });
      vi.spyOn(Section, "findOne").mockResolvedValue({ _id: "sec-next", name: "A" });

      vi.spyOn(Student, "findOne").mockResolvedValue({
        _id: "student-1",
        currentEnrollmentId: "enrollment-old",
        save: vi.fn().mockResolvedValue(true),
      });

      vi.spyOn(Enrollment, "updateOne").mockResolvedValue({});
      vi.spyOn(Enrollment, "findOne").mockResolvedValue(null);
      vi.spyOn(Enrollment, "countDocuments").mockResolvedValue(0);
      vi.spyOn(Enrollment, "create").mockResolvedValue({ _id: "enrollment-new" });

      const res = await request(app)
        .post("/api/v1/students/promote")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          studentIds: ["student-1"],
          targetAcademicYearId: "year-next",
          targetClassId: "class-next",
          targetSectionId: "sec-next",
          outcome: "promoted",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.promotedCount).toBe(1);
    });
  });
});

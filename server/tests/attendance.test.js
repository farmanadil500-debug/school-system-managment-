import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { signAccessToken } from "../src/utils/tokens.js";
import { ROLES, ATTENDANCE_STATUS } from "../src/constants/index.js";
import { Attendance } from "../src/modules/attendance/attendance.model.js";
import { School } from "../src/modules/school/school.model.js";
import { AcademicYear } from "../src/modules/academic/academic-year.model.js";
import { Section } from "../src/modules/academic/section.model.js";
import { TeachingAssignment } from "../src/modules/academic/teaching-assignment.model.js";
import { Enrollment } from "../src/modules/student/enrollment.model.js";
import { User } from "../src/modules/user/user.model.js";

describe("Unit 5: Attendance API", () => {
  const schoolId = "60d5ec49f1b2c8b1f8e4e1a2";
  const sectionId = "60d5ec49f1b2c8b1f8e4e1a4";
  const academicYearId = "60d5ec49f1b2c8b1f8e4e1a5";
  const teacherUserId = "60d5ec49f1b2c8b1f8e4e1b1";
  const studentId1 = "60d5ec49f1b2c8b1f8e4e1c1";
  const studentId2 = "60d5ec49f1b2c8b1f8e4e1c2";

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

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
    it("should return 401 when accessing attendance endpoints unauthenticated", async () => {
      const res = await request(app).get("/api/v1/attendance/history");
      expect(res.status).toBe(401);
    });

    it("should return 403 when an accountant attempts to mark attendance", async () => {
      const accountantToken = createToken(ROLES.ACCOUNTANT);
      const res = await request(app)
        .post("/api/v1/attendance/bulk")
        .set("Authorization", `Bearer ${accountantToken}`)
        .send({
          sectionId,
          date: todayStr,
          records: [{ studentId: studentId1, status: "Present" }],
        });

      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/v1/attendance/bulk (Marking Section Attendance)", () => {
    const validBulkPayload = {
      sectionId,
      date: todayStr,
      records: [
        { studentId: studentId1, status: "Present" },
        { studentId: studentId2, status: "Absent", remarks: "Sick" },
      ],
    };

    it("should return 400 when missing records array", async () => {
      const adminToken = createToken(ROLES.ADMIN);
      const res = await request(app)
        .post("/api/v1/attendance/bulk")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ sectionId, date: todayStr, records: [] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 when teacher attempts to mark attendance for a future date", async () => {
      const teacherToken = createToken(ROLES.TEACHER, teacherUserId);

      // Future date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const futureDateStr = futureDate.toISOString().slice(0, 10);

      vi.spyOn(Section, "findOne").mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          _id: sectionId,
          name: "A",
          classId: { name: "Grade 6" },
        }),
      });

      vi.spyOn(School, "findById").mockResolvedValue({
        _id: schoolId,
        settings: { attendanceEditDays: 2, timezone: "Asia/Karachi" },
      });

      vi.spyOn(AcademicYear, "findOne").mockResolvedValue({
        _id: academicYearId,
        isCurrent: true,
      });

      const res = await request(app)
        .post("/api/v1/attendance/bulk")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          ...validBulkPayload,
          date: futureDateStr,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("future date");
    });

    it("should return 403 when teacher tries to mark past attendance beyond the edit window", async () => {
      const teacherToken = createToken(ROLES.TEACHER, teacherUserId);

      // 5 days ago
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const pastDateStr = pastDate.toISOString().slice(0, 10);

      vi.spyOn(Section, "findOne").mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          _id: sectionId,
          name: "A",
          classId: { name: "Grade 6" },
        }),
      });

      vi.spyOn(School, "findById").mockResolvedValue({
        _id: schoolId,
        settings: { attendanceEditDays: 2, timezone: "Asia/Karachi" },
      });

      vi.spyOn(AcademicYear, "findOne").mockResolvedValue({
        _id: academicYearId,
        isCurrent: true,
      });

      const res = await request(app)
        .post("/api/v1/attendance/bulk")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          ...validBulkPayload,
          date: pastDateStr,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain("Attendance edit window");
    });

    it("should return 403 when teacher tries to mark attendance for a section they do not teach", async () => {
      const teacherToken = createToken(ROLES.TEACHER, teacherUserId);

      vi.spyOn(Section, "findOne").mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          _id: sectionId,
          name: "A",
          classId: { name: "Grade 6" },
        }),
      });

      vi.spyOn(School, "findById").mockResolvedValue({
        _id: schoolId,
        settings: { attendanceEditDays: 2, timezone: "Asia/Karachi" },
      });

      vi.spyOn(AcademicYear, "findOne").mockResolvedValue({
        _id: academicYearId,
        isCurrent: true,
      });

      vi.spyOn(User, "findById").mockResolvedValue({
        _id: teacherUserId,
        role: ROLES.TEACHER,
        staffId: teacherUserId,
      });

      // Not class teacher and no teaching assignment
      vi.spyOn(Section, "findOne").mockImplementation((query) => {
        if (query?.classTeacherId) {
          return Promise.resolve(null);
        }
        return {
          populate: vi.fn().mockResolvedValue({
            _id: sectionId,
            name: "A",
            classId: { name: "Grade 6" },
          }),
        };
      });

      vi.spyOn(TeachingAssignment, "findOne").mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/attendance/bulk")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send(validBulkPayload);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain("not assigned");
    });

    it("should return 200 and permit Admin to override past attendance beyond the edit window", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      // 10 days ago
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const pastDateStr = pastDate.toISOString().slice(0, 10);

      vi.spyOn(Section, "findOne").mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          _id: sectionId,
          name: "A",
          classId: { name: "Grade 6" },
        }),
      });

      vi.spyOn(School, "findById").mockResolvedValue({
        _id: schoolId,
        settings: { attendanceEditDays: 2, timezone: "Asia/Karachi" },
      });

      vi.spyOn(AcademicYear, "findOne").mockResolvedValue({
        _id: academicYearId,
        isCurrent: true,
      });

      vi.spyOn(Attendance, "bulkWrite").mockResolvedValue({ ok: 1 });

      const res = await request(app)
        .post("/api/v1/attendance/bulk")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          ...validBulkPayload,
          date: pastDateStr,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain("override");
      expect(res.body.data.summary.total).toBe(2);
      expect(res.body.data.summary.present).toBe(1);
      expect(res.body.data.summary.absent).toBe(1);
    });
  });

  describe("GET /api/v1/attendance/section (Get Sheet & Roster)", () => {
    it("should return 200 with merged roster, summary, and canEdit flag", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(Section, "findOne").mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          _id: sectionId,
          name: "A",
          classId: { name: "Grade 6" },
        }),
      });

      vi.spyOn(School, "findById").mockResolvedValue({
        _id: schoolId,
        settings: { attendanceEditDays: 2, timezone: "Asia/Karachi" },
      });

      vi.spyOn(AcademicYear, "findOne").mockResolvedValue({
        _id: academicYearId,
        isCurrent: true,
      });

      const mockEnrollments = [
        {
          studentId: {
            _id: studentId1,
            name: "Zainab Bibi",
            admissionNo: "ADM-2026-0001",
            rollNo: 1,
            gender: "female",
          },
          rollNo: 1,
        },
      ];

      const mockEnrollQuery = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockEnrollments),
      };
      vi.spyOn(Enrollment, "find").mockReturnValue(mockEnrollQuery);

      const mockAttendanceQuery = {
        lean: vi.fn().mockResolvedValue([
          {
            studentId: studentId1,
            date: todayStr,
            status: ATTENDANCE_STATUS.PRESENT,
          },
        ]),
      };
      vi.spyOn(Attendance, "find").mockReturnValue(mockAttendanceQuery);

      const res = await request(app)
        .get(`/api/v1/attendance/section?sectionId=${sectionId}&date=${todayStr}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.canEdit).toBe(true);
      expect(res.body.data.records).toHaveLength(1);
      expect(res.body.data.records[0].status).toBe(ATTENDANCE_STATUS.PRESENT);
      expect(res.body.data.summary.present).toBe(1);
    });
  });

  describe("GET /api/v1/attendance/history (Historical Attendance Sessions)", () => {
    it("should return 200 with historical sessions across dates", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      const mockHistory = [
        {
          date: todayStr,
          sectionId,
          sectionName: "A",
          className: "Grade 6",
          total: 30,
          present: 28,
          absent: 2,
          late: 0,
          leave: 0,
          percentage: 93,
        },
      ];

      vi.spyOn(Attendance, "aggregate").mockResolvedValue(mockHistory);

      const res = await request(app)
        .get(`/api/v1/attendance/history?sectionId=${sectionId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].className).toBe("Grade 6");
      expect(res.body.data[0].percentage).toBe(93);
    });
  });
});

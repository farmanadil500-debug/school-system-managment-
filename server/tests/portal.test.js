import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { signAccessToken } from "../src/utils/tokens.js";
import { ROLES, ATTENDANCE_STATUS } from "../src/constants/index.js";
import { Student } from "../src/modules/student/student.model.js";
import { Enrollment } from "../src/modules/student/enrollment.model.js";
import { Attendance } from "../src/modules/attendance/attendance.model.js";
import { FeeVoucher } from "../src/modules/fee/fee-voucher.model.js";
import { FeePayment } from "../src/modules/fee/fee-payment.model.js";
import { TimetableSlot } from "../src/modules/timetable/timetable-slot.model.js";
import { Exam } from "../src/modules/exam/exam.model.js";
import { ExamService } from "../src/modules/exam/exam.service.js";
import { Notice } from "../src/modules/notice/notice.model.js";

describe("Unit 11: Parent and Student Portals API", () => {
  const schoolId = "60d5ec49f1b2c8b1f8e4e1a2";
  const parent1GuardianId = "60d5ec49f1b2c8b1f8e4e1b1";
  const parent2GuardianId = "60d5ec49f1b2c8b1f8e4e1b2";

  const student1Id = "60d5ec49f1b2c8b1f8e4e1c1";
  const student2Id = "60d5ec49f1b2c8b1f8e4e1c2";
  const otherStudentId = "60d5ec49f1b2c8b1f8e4e1c3";

  const classId = "60d5ec49f1b2c8b1f8e4e1a3";
  const sectionId = "60d5ec49f1b2c8b1f8e4e1a4";
  const examId = "60d5ec49f1b2c8b1f8e4e1e1";

  const createToken = (role, extra = {}) =>
    signAccessToken({
      sub: extra.userId || "60d5ec49f1b2c8b1f8e4e1a1",
      role,
      schoolId,
      ...extra,
    });

  const parent1Token = createToken(ROLES.PARENT, { guardianId: parent1GuardianId });
  const student1Token = createToken(ROLES.STUDENT, { studentId: student1Id });
  const teacherToken = createToken(ROLES.TEACHER);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication & RBAC Security", () => {
    it("should return 401 when accessing portal endpoints unauthenticated", async () => {
      const res = await request(app).get("/api/v1/portal/children");
      expect(res.status).toBe(401);
    });

    it("should return 403 when a teacher attempts to access portal children route", async () => {
      const res = await request(app)
        .get("/api/v1/portal/children")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe("Parent Child Switcher: GET /api/v1/portal/children", () => {
    it("should return all linked children for a parent user", async () => {
      vi.spyOn(Student, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: student1Id,
              name: "Ali Khan",
              admissionNo: "ADM-2026-0001",
              status: "active",
              guardianIds: [parent1GuardianId],
            },
            {
              _id: student2Id,
              name: "Sara Khan",
              admissionNo: "ADM-2026-0002",
              status: "active",
              guardianIds: [parent1GuardianId],
            },
          ]),
        }),
      });

      vi.spyOn(Enrollment, "findOne").mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({
          _id: "60d5ec49f1b2c8b1f8e4e1d1",
          rollNo: 5,
          classId: { _id: classId, name: "Grade 5" },
          sectionId: {
            _id: sectionId,
            name: "A",
            classTeacherId: { name: "Sir Aslam" },
          },
          academicYearId: { name: "2026-2027" },
        }),
      });

      const res = await request(app)
        .get("/api/v1/portal/children")
        .set("Authorization", `Bearer ${parent1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].name).toBe("Ali Khan");
      expect(res.body.data[0].enrollment.className).toBe("Grade 5");
    });
  });

  describe("Ownership Isolation & Forbidden Checks", () => {
    it("should return 403 when Parent A attempts to view records of Parent B's child", async () => {
      // Mock student belonging to parent 2
      vi.spyOn(Student, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: otherStudentId,
          name: "Other Student",
          schoolId,
          guardianIds: [parent2GuardianId],
        }),
      });

      const res = await request(app)
        .get(`/api/v1/portal/student/${otherStudentId}`)
        .set("Authorization", `Bearer ${parent1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/do not have permission/i);
    });

    it("should return 403 when Student A attempts to view Student B's profile", async () => {
      vi.spyOn(Student, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: student2Id,
          name: "Sara Khan",
          schoolId,
          guardianIds: [parent1GuardianId],
        }),
      });

      const res = await request(app)
        .get(`/api/v1/portal/student/${student2Id}`)
        .set("Authorization", `Bearer ${student1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/only view your own/i);
    });

    it("should return 403 when Parent A directly calls core attendance endpoint for another parent's child", async () => {
      vi.spyOn(Student, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: otherStudentId,
          name: "Other Student",
          schoolId,
          guardianIds: [parent2GuardianId],
        }),
      });

      const res = await request(app)
        .get(`/api/v1/attendance/student/${otherStudentId}`)
        .set("Authorization", `Bearer ${parent1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/only view attendance records for your own children/i);
    });

    it("should return 403 when Parent A directly calls core report card endpoint for another parent's child", async () => {
      vi.spyOn(Exam, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: examId,
          schoolId,
          status: "published",
        }),
      });

      vi.spyOn(Student, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: otherStudentId,
          name: "Other Student",
          schoolId,
          guardianIds: [parent2GuardianId],
        }),
      });

      const res = await request(app)
        .get(`/api/v1/exams/${examId}/students/${otherStudentId}/report-card`)
        .set("Authorization", `Bearer ${parent1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/only view report cards for your own children/i);
    });
  });

  describe("Portal Data Endpoints (Authorized Parent/Student)", () => {
    it("GET /api/v1/portal/student/:studentId/attendance - should return attendance summary and logs", async () => {
      vi.spyOn(Student, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: student1Id,
          name: "Ali Khan",
          schoolId,
          guardianIds: [parent1GuardianId],
        }),
      });

      vi.spyOn(Attendance, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { date: "2026-11-20", status: ATTENDANCE_STATUS.PRESENT, remarks: "On time" },
            { date: "2026-11-19", status: ATTENDANCE_STATUS.PRESENT, remarks: "" },
            { date: "2026-11-18", status: ATTENDANCE_STATUS.ABSENT, remarks: "Sick" },
          ]),
        }),
      });

      const res = await request(app)
        .get(`/api/v1/portal/student/${student1Id}/attendance?month=2026-11`)
        .set("Authorization", `Bearer ${parent1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.totalDays).toBe(3);
      expect(res.body.data.summary.presentDays).toBe(2);
      expect(res.body.data.summary.absentDays).toBe(1);
      expect(res.body.data.records.length).toBe(3);
    });

    it("GET /api/v1/portal/student/:studentId/fees - should return vouchers, balances and receipts", async () => {
      vi.spyOn(Student, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: student1Id,
          name: "Ali Khan",
          schoolId,
          guardianIds: [parent1GuardianId],
        }),
      });

      const voucherId = "60d5ec49f1b2c8b1f8e4e1f1";
      vi.spyOn(FeeVoucher, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([
              {
                _id: voucherId,
                voucherNo: "VCH-2026-0001",
                period: "2026-11",
                total: 5000,
                paidAmount: 3000,
                balance: 2000,
                dueDate: "2026-11-10",
                status: "partial",
                items: [{ name: "Tuition Fee", amount: 5000 }],
              },
            ]),
          }),
        }),
      });

      vi.spyOn(FeePayment, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              receiptNo: "REC-2026-0001",
              amount: 3000,
              method: "cash",
              receivedAt: new Date("2026-11-05"),
            },
          ]),
        }),
      });

      const res = await request(app)
        .get(`/api/v1/portal/student/${student1Id}/fees`)
        .set("Authorization", `Bearer ${parent1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overview.totalDues).toBe(5000);
      expect(res.body.data.overview.totalPending).toBe(2000);
      expect(res.body.data.vouchers[0].payments[0].receiptNo).toBe("REC-2026-0001");
    });

    it("GET /api/v1/portal/student/:studentId/timetable - should return section timetable grouped by day", async () => {
      vi.spyOn(Student, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: student1Id,
          name: "Ali Khan",
          schoolId,
          guardianIds: [parent1GuardianId],
        }),
      });

      vi.spyOn(Enrollment, "findOne").mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({
          _id: "60d5ec49f1b2c8b1f8e4e1d1",
          sectionId: { _id: sectionId, name: "A" },
          classId: { _id: classId, name: "Grade 5" },
        }),
      });

      vi.spyOn(TimetableSlot, "find").mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              day: "monday",
              period: 1,
              startTime: "08:00",
              endTime: "08:45",
              room: "Room 101",
              subjectId: { name: "Mathematics", code: "MATH-5" },
              staffId: { name: "Sir Aslam" },
            },
          ]),
        }),
      });

      const res = await request(app)
        .get(`/api/v1/portal/student/${student1Id}/timetable`)
        .set("Authorization", `Bearer ${parent1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.schedule.monday.length).toBe(1);
      expect(res.body.data.schedule.monday[0].subject).toBe("Mathematics");
    });

    it("GET /api/v1/portal/student/:studentId/exams - should only return published exam report cards", async () => {
      vi.spyOn(Student, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: student1Id,
          name: "Ali Khan",
          schoolId,
          guardianIds: [parent1GuardianId],
        }),
      });

      vi.spyOn(Exam, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: examId,
              name: "Midterm Examination 2026",
              status: "published",
            },
          ]),
        }),
      });

      vi.spyOn(ExamService, "getStudentReportCard").mockResolvedValue({
        examName: "Midterm Examination 2026",
        studentName: "Ali Khan",
        grandTotalMax: 300,
        grandTotalObtained: 270,
        overallPercentage: 90,
        overallGrade: "A+",
        classPosition: 2,
        isOverallPassed: true,
      });

      const res = await request(app)
        .get(`/api/v1/portal/student/${student1Id}/exams`)
        .set("Authorization", `Bearer ${parent1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].overallGrade).toBe("A+");
      expect(res.body.data[0].classPosition).toBe(2);
    });

    it("GET /api/v1/portal/student/:studentId/notices - should return notices filtered for student/parent", async () => {
      vi.spyOn(Student, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: student1Id,
          name: "Ali Khan",
          schoolId,
          guardianIds: [parent1GuardianId],
        }),
      });

      vi.spyOn(Enrollment, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          classId,
          sectionId,
        }),
      });

      vi.spyOn(Notice, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([
              {
                _id: "60d5ec49f1b2c8b1f8e4e101",
                title: "Parent-Teacher Meeting Scheduled",
                body: "PTM will be held this Saturday.",
                isPinned: true,
                publishedAt: new Date(),
              },
            ]),
          }),
        }),
      });

      const res = await request(app)
        .get(`/api/v1/portal/student/${student1Id}/notices`)
        .set("Authorization", `Bearer ${parent1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe("Parent-Teacher Meeting Scheduled");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { signAccessToken } from "../src/utils/tokens.js";
import { ROLES } from "../src/constants/index.js";
import { Enrollment } from "../src/modules/student/enrollment.model.js";
import { Staff } from "../src/modules/staff/staff.model.js";
import { Attendance } from "../src/modules/attendance/attendance.model.js";
import { FeeVoucher } from "../src/modules/fee/fee-voucher.model.js";
import { Exam } from "../src/modules/exam/exam.model.js";
import { ExamSubject } from "../src/modules/exam/exam-subject.model.js";
import { Mark } from "../src/modules/exam/mark.model.js";
import { AuditLog } from "../src/modules/audit/audit-log.model.js";

describe("Unit 10: Dashboards & Reports API", () => {
  const schoolId = "60d5ec49f1b2c8b1f8e4e1a2";
  const academicYearId = "60d5ec49f1b2c8b1f8e4e1a5";
  const classId = "60d5ec49f1b2c8b1f8e4e1a3";
  const sectionId = "60d5ec49f1b2c8b1f8e4e1a4";
  const examId = "60d5ec49f1b2c8b1f8e4e1e1";
  const studentId = "60d5ec49f1b2c8b1f8e4e1c1";

  const createToken = (role, extra = {}) =>
    signAccessToken({
      sub: extra.userId || "60d5ec49f1b2c8b1f8e4e1a1",
      role,
      schoolId,
      ...extra,
    });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication & RBAC Protection", () => {
    it("should return 401 when accessing dashboard stats unauthenticated", async () => {
      const res = await request(app).get("/api/v1/dashboard/stats");
      expect(res.status).toBe(401);
    });

    it("should return 403 when an accountant tries to view attendance reports", async () => {
      const accountantToken = createToken(ROLES.ACCOUNTANT);
      const res = await request(app)
        .get("/api/v1/reports/attendance")
        .set("Authorization", `Bearer ${accountantToken}`);

      expect(res.status).toBe(403);
    });

    it("should return 403 when a teacher tries to view financial fee reports", async () => {
      const teacherToken = createToken(ROLES.TEACHER);
      const res = await request(app)
        .get("/api/v1/reports/fees")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/dashboard/stats (Role-Aware Aggregates)", () => {
    it("should return complete administrative aggregates for admin", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(Enrollment, "countDocuments").mockResolvedValue(150);
      vi.spyOn(Staff, "countDocuments").mockResolvedValue(18);

      vi.spyOn(Attendance, "find").mockReturnValue({
        lean: vi
          .fn()
          .mockResolvedValue([
            { status: "Present" },
            { status: "Present" },
            { status: "Absent" },
            { status: "Late" },
          ]),
      });

      vi.spyOn(FeeVoucher, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { total: 50000, paidAmount: 30000, balance: 20000 },
          { total: 50000, paidAmount: 50000, balance: 0 },
        ]),
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([{ paidAmount: 80000 }]),
        }),
      });

      vi.spyOn(AuditLog, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([
                {
                  _id: "log1",
                  action: "FEE_PAYMENT_COLLECTED",
                  entityType: "FeePayment",
                  at: new Date(),
                  actorId: { name: "Cashier John" },
                },
              ]),
            }),
          }),
        }),
      });

      const res = await request(app)
        .get("/api/v1/dashboard/stats")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(ROLES.ADMIN);
      expect(res.body.data.overview.totalStudents).toBe(150);
      expect(res.body.data.overview.totalStaff).toBe(18);
      expect(res.body.data.overview.todayPresentCount).toBe(2);
      expect(res.body.data.overview.monthlyFeeCollected).toBe(80000);
      expect(res.body.data.monthlyCollections).toHaveLength(6);
      expect(res.body.data.recentActivity).toHaveLength(1);
    });
  });

  describe("GET /api/v1/reports/attendance & CSV Export", () => {
    it("should return attendance summary and student statistics", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(Enrollment, "find").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([
                {
                  studentId: { _id: studentId, admissionNo: "ADM-2026-001", name: "Ali Khan" },
                  classId: { name: "Grade 10" },
                  sectionId: { name: "A" },
                  rollNo: 1,
                },
              ]),
            }),
          }),
        }),
      });

      vi.spyOn(Attendance, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { studentId, status: "Present" },
          { studentId, status: "Present" },
          { studentId, status: "Absent" },
          { studentId, status: "Present" },
        ]),
      });

      const res = await request(app)
        .get("/api/v1/reports/attendance")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.totalStudents).toBe(1);
      expect(res.body.data.records[0].present).toBe(3);
      expect(res.body.data.records[0].absent).toBe(1);
      expect(res.body.data.records[0].percentage).toBe(75);
    });

    it("should stream attendance CSV export with proper attachment headers", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(Enrollment, "find").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([
                {
                  studentId: { _id: studentId, admissionNo: "ADM-2026-001", name: "Ali Khan" },
                  classId: { name: "Grade 10" },
                  sectionId: { name: "A" },
                  rollNo: 1,
                },
              ]),
            }),
          }),
        }),
      });

      vi.spyOn(Attendance, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ studentId, status: "Present" }]),
      });

      const res = await request(app)
        .get("/api/v1/reports/attendance/export/csv")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/csv");
      expect(res.headers["content-disposition"]).toContain("attachment; filename=");
      expect(res.text).toContain("Admission No,Student Name,Class,Section");
      expect(res.text).toContain("Ali Khan");
    });
  });

  describe("GET /api/v1/reports/fees & CSV Export", () => {
    it("should return fee collection metrics for accountant", async () => {
      const accountantToken = createToken(ROLES.ACCOUNTANT);

      vi.spyOn(FeeVoucher, "find").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([
              {
                _id: "vch1",
                voucherNo: "VCH-2026-0001",
                period: "2026-04",
                studentId: { admissionNo: "ADM-001", name: "Sara" },
                enrollmentId: { classId: { name: "Grade 1" }, sectionId: { name: "A" } },
                total: 10000,
                paidAmount: 10000,
                balance: 0,
                status: "paid",
              },
            ]),
          }),
        }),
      });

      const res = await request(app)
        .get("/api/v1/reports/fees")
        .set("Authorization", `Bearer ${accountantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.totalBilled).toBe(10000);
      expect(res.body.data.summary.totalCollected).toBe(10000);
      expect(res.body.data.summary.collectionRate).toBe(100);
    });
  });

  describe("GET /api/v1/reports/exams & CSV Export", () => {
    it("should return academic performance with grade distribution and position rankings", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(Exam, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: examId,
          name: "Annual Final Exam 2026",
          termName: "Term 2",
        }),
      });

      vi.spyOn(ExamSubject, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ subjectId: "sub1", totalMarks: 100, passingMarks: 40 }]),
      });

      vi.spyOn(Mark, "find").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([
                {
                  studentId: { _id: studentId, admissionNo: "ADM-001", name: "Top Student" },
                  subjectId: { _id: "sub1", name: "Mathematics" },
                  sectionId: { name: "A" },
                  marksObtained: 95,
                  isAbsent: false,
                },
                {
                  studentId: { _id: "student-2", admissionNo: "ADM-002", name: "Second Student" },
                  subjectId: { _id: "sub1", name: "Mathematics" },
                  sectionId: { name: "A" },
                  marksObtained: 82,
                  isAbsent: false,
                },
              ]),
            }),
          }),
        }),
      });

      const res = await request(app)
        .get(`/api/v1/reports/exams?examId=${examId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.totalStudents).toBe(2);
      expect(res.body.data.summary.highestScore).toBe(95);
      expect(res.body.data.summary.gradeDistribution["A+"]).toBe(1);
      expect(res.body.data.summary.gradeDistribution["A"]).toBe(1);
      expect(res.body.data.records[0].position).toBe(1);
      expect(res.body.data.records[1].position).toBe(2);
    });
  });
});

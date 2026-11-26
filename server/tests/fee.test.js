import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { signAccessToken } from "../src/utils/tokens.js";
import { ROLES } from "../src/constants/index.js";
import { FeeStructure } from "../src/modules/fee/fee-structure.model.js";
import { FeeVoucher } from "../src/modules/fee/fee-voucher.model.js";
import { FeePayment } from "../src/modules/fee/fee-payment.model.js";
import { School } from "../src/modules/school/school.model.js";
import { AcademicYear } from "../src/modules/academic/academic-year.model.js";
import { Enrollment } from "../src/modules/student/enrollment.model.js";
import * as counterModule from "../src/modules/counter/counter.model.js";

describe("Unit 6: Fee Management API", () => {
  const schoolId = "60d5ec49f1b2c8b1f8e4e1a2";
  const academicYearId = "60d5ec49f1b2c8b1f8e4e1a5";
  const classId = "60d5ec49f1b2c8b1f8e4e1a3";
  const voucherId = "60d5ec49f1b2c8b1f8e4e1d1";
  const studentId = "60d5ec49f1b2c8b1f8e4e1c1";
  const paymentId = "60d5ec49f1b2c8b1f8e4e1e1";

  const createToken = (role) =>
    signAccessToken({
      sub: "60d5ec49f1b2c8b1f8e4e1a1",
      role,
      schoolId,
    });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication & RBAC Security", () => {
    it("should return 401 when accessing fee vouchers unauthenticated", async () => {
      const res = await request(app).get("/api/v1/fees/vouchers");
      expect(res.status).toBe(401);
    });

    it("should return 403 when a teacher attempts to generate monthly vouchers", async () => {
      const teacherToken = createToken(ROLES.TEACHER);
      const res = await request(app)
        .post("/api/v1/fees/vouchers/generate")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ period: "2026-11" });

      expect(res.status).toBe(403);
    });

    it("should return 403 when a student attempts to record fee collection", async () => {
      const studentToken = createToken(ROLES.STUDENT);
      const res = await request(app)
        .post(`/api/v1/fees/vouchers/${voucherId}/payments`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ amount: 5000, method: "cash" });

      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/v1/fees/structures (Class Fee Structure)", () => {
    it("should return 200 and upsert fee structure for a grade level", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(AcademicYear, "findOne").mockResolvedValue({
        _id: academicYearId,
        isCurrent: true,
      });

      const mockStructure = {
        _id: "structure-1",
        schoolId,
        academicYearId,
        classId,
        items: [
          { name: "Monthly Tuition Fee", amount: 5000, frequency: "monthly" },
          { name: "Computer Lab Fee", amount: 500, frequency: "monthly" },
        ],
      };

      vi.spyOn(FeeStructure, "findOneAndUpdate").mockResolvedValue(mockStructure);

      const res = await request(app)
        .post("/api/v1/fees/structures")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          classId,
          items: [
            { name: "Monthly Tuition Fee", amount: 5000, frequency: "monthly" },
            { name: "Computer Lab Fee", amount: 500, frequency: "monthly" },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2);
    });
  });

  describe("POST /api/v1/fees/vouchers/generate (Monthly Generation & Idempotency)", () => {
    it("should generate vouchers for enrolled students and skip already generated ones", async () => {
      const accountantToken = createToken(ROLES.ACCOUNTANT);

      vi.spyOn(School, "findById").mockResolvedValue({
        _id: schoolId,
        settings: { feeDueDay: 10 },
      });

      vi.spyOn(AcademicYear, "findOne").mockResolvedValue({
        _id: academicYearId,
        isCurrent: true,
      });

      const mockEnrollments = [
        {
          _id: "enrollment-1",
          classId,
          studentId: {
            _id: studentId,
            name: "Ayesha Khan",
            status: "active",
            feeAmount: 5000,
          },
        },
      ];

      vi.spyOn(Enrollment, "find").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockEnrollments),
        }),
      });

      vi.spyOn(FeeStructure, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      // No existing voucher -> generate
      vi.spyOn(FeeVoucher, "findOne").mockResolvedValue(null);
      vi.spyOn(counterModule, "getNextSequence").mockResolvedValue(1);
      vi.spyOn(FeeVoucher, "create").mockResolvedValue({
        voucherNo: "VCH-2026-0001",
      });

      const res = await request(app)
        .post("/api/v1/fees/vouchers/generate")
        .set("Authorization", `Bearer ${accountantToken}`)
        .send({ period: "2026-11" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.generatedCount).toBe(1);
      expect(res.body.data.skippedCount).toBe(0);
    });
  });

  describe("POST /api/v1/fees/vouchers/:id/payments (Payment Collection & Receipts)", () => {
    it("should return 400 if payment amount exceeds outstanding voucher balance", async () => {
      const accountantToken = createToken(ROLES.ACCOUNTANT);

      vi.spyOn(FeeVoucher, "findOne").mockResolvedValue({
        _id: voucherId,
        schoolId,
        total: 5000,
        paidAmount: 2000,
        balance: 3000,
        status: "partial",
      });

      const res = await request(app)
        .post(`/api/v1/fees/vouchers/${voucherId}/payments`)
        .set("Authorization", `Bearer ${accountantToken}`)
        .send({ amount: 4000, method: "cash" }); // Exceeds balance of 3000

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("exceeds outstanding balance");
    });

    it("should record payment, issue receipt number, and update voucher status", async () => {
      const accountantToken = createToken(ROLES.ACCOUNTANT);

      const mockVoucher = {
        _id: voucherId,
        schoolId,
        studentId,
        total: 5000,
        paidAmount: 0,
        balance: 5000,
        status: "unpaid",
        save: vi.fn().mockResolvedValue(true),
        toJSON: () => ({
          _id: voucherId,
          total: 5000,
          paidAmount: 3000,
          balance: 2000,
          status: "partial",
        }),
      };

      vi.spyOn(FeeVoucher, "findOne").mockResolvedValue(mockVoucher);
      vi.spyOn(counterModule, "getNextSequence").mockResolvedValue(101);

      vi.spyOn(FeePayment, "create").mockResolvedValue({
        _id: paymentId,
        receiptNo: `REC-2026-0101`,
        amount: 3000,
        method: "cash",
        status: "posted",
        toJSON: () => ({
          _id: paymentId,
          receiptNo: "REC-2026-0101",
          amount: 3000,
          method: "cash",
          status: "posted",
        }),
      });

      const res = await request(app)
        .post(`/api/v1/fees/vouchers/${voucherId}/payments`)
        .set("Authorization", `Bearer ${accountantToken}`)
        .send({ amount: 3000, method: "cash" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.receiptNo).toBe("REC-2026-0101");
      expect(mockVoucher.paidAmount).toBe(3000);
      expect(mockVoucher.balance).toBe(2000);
      expect(mockVoucher.status).toBe("partial");
    });
  });

  describe("POST /api/v1/fees/payments/:paymentId/reverse (Payment Reversal)", () => {
    it("should reverse posted payment and restore voucher balance", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      const mockPayment = {
        _id: paymentId,
        receiptNo: "REC-2026-0101",
        schoolId,
        voucherId,
        amount: 3000,
        status: "posted",
        save: vi.fn().mockResolvedValue(true),
      };

      const mockVoucher = {
        _id: voucherId,
        schoolId,
        total: 5000,
        paidAmount: 3000,
        balance: 2000,
        status: "partial",
        save: vi.fn().mockResolvedValue(true),
        toJSON: () => ({
          _id: voucherId,
          total: 5000,
          paidAmount: 0,
          balance: 5000,
          status: "unpaid",
        }),
      };

      vi.spyOn(FeePayment, "findOne").mockResolvedValue(mockPayment);
      vi.spyOn(FeeVoucher, "findOne").mockResolvedValue(mockVoucher);

      const res = await request(app)
        .post(`/api/v1/fees/payments/${paymentId}/reverse`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Cheque bounced" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPayment.status).toBe("reversed");
      expect(mockVoucher.paidAmount).toBe(0);
      expect(mockVoucher.balance).toBe(5000);
      expect(mockVoucher.status).toBe("unpaid");
    });
  });

  describe("GET /api/v1/fees/defaulters (Overdue & Defaulters Report)", () => {
    it("should return defaulters with calculated days overdue", async () => {
      const accountantToken = createToken(ROLES.ACCOUNTANT);

      const mockOverdueVouchers = [
        {
          _id: voucherId,
          voucherNo: "VCH-2026-0001",
          period: "2026-10",
          dueDate: "2026-10-10",
          total: 5000,
          paidAmount: 0,
          balance: 5000,
          studentId: {
            _id: studentId,
            name: "Ayesha Khan",
            admissionNo: "ADM-2026-0001",
            emergencyContactPhone: "+923001234567",
            guardianId: { name: "Tariq Khan", phone: "+923001234567" },
          },
          enrollmentId: {
            classId: { name: "Grade 5" },
            sectionId: { name: "A" },
          },
        },
      ];

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockOverdueVouchers),
      };
      vi.spyOn(FeeVoucher, "find").mockReturnValue(mockQuery);

      const res = await request(app)
        .get("/api/v1/fees/defaulters")
        .set("Authorization", `Bearer ${accountantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].studentName).toBe("Ayesha Khan");
      expect(res.body.data[0].balance).toBe(5000);
      expect(res.body.data[0].daysOverdue).toBeGreaterThan(0);
    });
  });
});

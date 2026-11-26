import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { signAccessToken } from "../src/utils/tokens.js";
import { ROLES } from "../src/constants/index.js";
import { Student } from "../src/modules/student/student.model.js";
import { User } from "../src/modules/user/user.model.js";
import { FeeVoucher } from "../src/modules/fee/fee-voucher.model.js";

describe("Unit 12: System Hardening, SLA, Security & Go-Live Verification", () => {
  const schoolId = "60d5ec49f1b2c8b1f8e4e1a2";

  const createToken = (role, extra = {}) =>
    signAccessToken({
      sub: extra.userId || "60d5ec49f1b2c8b1f8e4e1a1",
      role,
      schoolId,
      ...extra,
    });

  const superAdminToken = createToken(ROLES.SUPER_ADMIN);
  const adminToken = createToken(ROLES.ADMIN);
  const teacherToken = createToken(ROLES.TEACHER, { staffId: "60d5ec49f1b2c8b1f8e4e1s1" });
  const accountantToken = createToken(ROLES.ACCOUNTANT);
  const parentToken = createToken(ROLES.PARENT, { guardianId: "60d5ec49f1b2c8b1f8e4e1g1" });
  const studentToken = createToken(ROLES.STUDENT, { studentId: "60d5ec49f1b2c8b1f8e4e1c1" });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Performance SLA & Latency (< 500 ms Benchmark)", () => {
    it("should respond to GET /api/v1/students in under 500 ms", async () => {
      vi.spyOn(Student, "countDocuments").mockResolvedValue(2000);
      vi.spyOn(Student, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              populate: vi.fn().mockReturnValue({
                populate: vi.fn().mockReturnValue({
                  lean: vi.fn().mockResolvedValue(
                    Array.from({ length: 20 }, (_, i) => ({
                      _id: `60d5ec49f1b2c8b1f8e4e1${String(i).padStart(2, "0")}`,
                      admissionNo: `ADM-2026-${String(i + 1).padStart(4, "0")}`,
                      name: `Student ${i + 1}`,
                      status: "active",
                      emergencyPhone: "+923001234567",
                    }))
                  ),
                }),
              }),
            }),
          }),
        }),
      });

      const start = performance.now();
      const res = await request(app)
        .get("/api/v1/students?page=1&limit=20")
        .set("Authorization", `Bearer ${adminToken}`);
      const duration = performance.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(500); // Must be strictly under 500ms SLA
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(20);
    });

    it("should respond to GET /api/v1/fees/vouchers in under 500 ms", async () => {
      vi.spyOn(FeeVoucher, "countDocuments").mockResolvedValue(2000);
      vi.spyOn(FeeVoucher, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              populate: vi.fn().mockReturnValue({
                populate: vi.fn().mockReturnValue({
                  lean: vi.fn().mockResolvedValue(
                    Array.from({ length: 20 }, (_, i) => ({
                      _id: `60d5ec49f1b2c8b1f8e4e2${String(i).padStart(2, "0")}`,
                      voucherNo: `VCH-2026-${String(i + 1).padStart(4, "0")}`,
                      period: "2026-11",
                      total: 4500,
                      paidAmount: 4500,
                      balance: 0,
                      status: "paid",
                    }))
                  ),
                }),
              }),
            }),
          }),
        }),
      });

      vi.spyOn(FeeVoucher, "aggregate").mockResolvedValue([
        { _id: null, totalExpected: 9000000, totalCollected: 7200000, totalPending: 1800000 },
      ]);

      const start = performance.now();
      const res = await request(app)
        .get("/api/v1/fees/vouchers?page=1&limit=20")
        .set("Authorization", `Bearer ${accountantToken}`);
      const duration = performance.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(500);
      expect(res.body.success).toBe(true);
    });
  });

  describe("2. Security & Boundary Protection", () => {
    it("GET /api/v1/health should return system status without leaking secrets or credentials", async () => {
      const res = await request(app).get("/api/v1/health");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("ok");

      // Verify no sensitive keys or connection strings are leaked
      const bodyStr = JSON.stringify(res.body).toLowerCase();
      expect(bodyStr).not.toContain("secret");
      expect(bodyStr).not.toContain("password");
      expect(bodyStr).not.toContain("mongodb+srv");
      expect(bodyStr).not.toContain("jwt");
    });

    it("should reject excessive pagination limits (>100) at the API validation boundary", async () => {
      const res = await request(app)
        .get("/api/v1/students?limit=500")
        .set("Authorization", `Bearer ${adminToken}`);

      // Zod schema enforces .max(100), returning 400 Validation Error
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("3. Multi-Role RBAC Smoke Test Matrix", () => {
    it("Super Admin: should have access to system user management", async () => {
      vi.spyOn(User, "countDocuments").mockResolvedValue(5);
      vi.spyOn(User, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue([
                  {
                    _id: "60d5ec49f1b2c8b1f8e4e1a1",
                    email: "admin@apexschool.com",
                    role: ROLES.SUPER_ADMIN,
                  },
                ]),
              }),
            }),
          }),
        }),
      });

      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("Teacher: should be forbidden from accessing fee voucher generation", async () => {
      const res = await request(app)
        .post("/api/v1/fees/vouchers/generate")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ period: "2026-11" });

      expect(res.status).toBe(403);
    });

    it("Accountant: should be forbidden from marking student attendance", async () => {
      const res = await request(app)
        .post("/api/v1/attendance/bulk")
        .set("Authorization", `Bearer ${accountantToken}`)
        .send({
          sectionId: "60d5ec49f1b2c8b1f8e4e1a4",
          date: "2026-11-20",
          records: [],
        });

      expect(res.status).toBe(403);
    });

    it("Student: should be forbidden from creating timetable lesson slots", async () => {
      const res = await request(app)
        .post("/api/v1/timetables/slots")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({});

      expect(res.status).toBe(403);
    });

    it("Parent: should be forbidden from managing school users", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
    });
  });
});

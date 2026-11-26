import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
} from "../src/utils/tokens.js";
import { ROLES, USER_STATUS, hasPermission } from "../src/constants/index.js";
import { User } from "../src/modules/user/user.model.js";
import { RefreshToken } from "../src/modules/auth/refresh-token.model.js";
import bcrypt from "bcryptjs";

describe("Unit 1: Auth & RBAC Core", () => {
  describe("Token Utility Functions", () => {
    it("should sign and verify valid access tokens", () => {
      const payload = {
        sub: "user-123",
        role: ROLES.TEACHER,
        schoolId: "school-456",
      };

      const token = signAccessToken(payload);
      expect(typeof token).toBe("string");

      const decoded = verifyAccessToken(token);
      expect(decoded.sub).toBe("user-123");
      expect(decoded.role).toBe(ROLES.TEACHER);
      expect(decoded.schoolId).toBe("school-456");
    });

    it("should sign and verify refresh tokens", () => {
      const payload = {
        sub: "user-123",
        familyId: "fam-789",
      };

      const token = signRefreshToken(payload);
      expect(typeof token).toBe("string");

      const decoded = verifyRefreshToken(token);
      expect(decoded.sub).toBe("user-123");
      expect(decoded.familyId).toBe("fam-789");
    });

    it("should hash tokens deterministically using sha256", () => {
      const hash1 = hashToken("test-token-value");
      const hash2 = hashToken("test-token-value");
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 is 64 hex chars
    });
  });

  describe("Permission Matrix & hasPermission()", () => {
    it("super_admin has wildcard access to all permissions", () => {
      expect(hasPermission(ROLES.SUPER_ADMIN, "users:create")).toBe(true);
      expect(hasPermission(ROLES.SUPER_ADMIN, "anything:arbitrary")).toBe(true);
    });

    it("teacher has section and own-marks permissions but not user creation", () => {
      expect(hasPermission(ROLES.TEACHER, "attendance:write_own_sections")).toBe(true);
      expect(hasPermission(ROLES.TEACHER, "users:create")).toBe(false);
    });

    it("accountant has fee and finance permissions", () => {
      expect(hasPermission(ROLES.ACCOUNTANT, "fees:write")).toBe(true);
      expect(hasPermission(ROLES.ACCOUNTANT, "exams:marks_entry_own")).toBe(false);
    });
  });

  describe("Auth API Endpoints", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    describe("POST /api/v1/auth/login", () => {
      it("should reject request when identifier or password is missing (400 validation error)", async () => {
        const res = await request(app).post("/api/v1/auth/login").send({
          identifier: "",
          password: "",
        });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
      });

      it("should return 401 when user is not found", async () => {
        vi.spyOn(User, "findOne").mockResolvedValue(null);

        const res = await request(app).post("/api/v1/auth/login").send({
          identifier: "nonexistent@apexschool.com",
          password: "Password123!",
        });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
      });

      it("should return 401 when password does not match", async () => {
        const mockUser = {
          _id: "user-123",
          email: "teacher@apexschool.com",
          passwordHash: "hashed-pass",
          isLocked: () => false,
          status: USER_STATUS.ACTIVE,
          failedLoginAttempts: 0,
          save: vi.fn().mockResolvedValue(true),
        };

        vi.spyOn(User, "findOne").mockResolvedValue(mockUser);
        vi.spyOn(bcrypt, "compare").mockResolvedValue(false);

        const res = await request(app).post("/api/v1/auth/login").send({
          identifier: "teacher@apexschool.com",
          password: "WrongPassword!",
        });

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
        expect(mockUser.failedLoginAttempts).toBe(1);
      });

      it("should return 200 and set httpOnly cookie on successful login", async () => {
        const mockUser = {
          _id: "60d5ec49f1b2c8b1f8e4e1a1",
          email: "teacher@apexschool.com",
          role: ROLES.TEACHER,
          schoolId: "60d5ec49f1b2c8b1f8e4e1a2",
          passwordHash: "hashed-pass",
          status: USER_STATUS.ACTIVE,
          failedLoginAttempts: 0,
          isLocked: () => false,
          save: vi.fn().mockResolvedValue(true),
          toJSON: () => ({
            _id: "60d5ec49f1b2c8b1f8e4e1a1",
            email: "teacher@apexschool.com",
            role: ROLES.TEACHER,
            schoolId: "60d5ec49f1b2c8b1f8e4e1a2",
            status: USER_STATUS.ACTIVE,
          }),
        };

        vi.spyOn(User, "findOne").mockResolvedValue(mockUser);
        vi.spyOn(bcrypt, "compare").mockResolvedValue(true);
        vi.spyOn(RefreshToken, "create").mockResolvedValue({});

        const res = await request(app).post("/api/v1/auth/login").send({
          identifier: "teacher@apexschool.com",
          password: "CorrectPassword123!",
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe("teacher@apexschool.com");
        expect(res.body.data.accessToken).toBeDefined();

        // Check httpOnly refresh cookie
        const cookies = res.headers["set-cookie"];
        expect(cookies).toBeDefined();
        expect(cookies.some((c) => c.includes("refreshToken="))).toBe(true);
      });
    });

    describe("GET /api/v1/auth/me", () => {
      it("should return 401 when no token is provided", async () => {
        const res = await request(app).get("/api/v1/auth/me");
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe("AUTH_REQUIRED");
      });

      it("should return 200 and user profile when valid Bearer token is sent", async () => {
        const testUser = {
          _id: "60d5ec49f1b2c8b1f8e4e1a1",
          email: "teacher@apexschool.com",
          role: ROLES.TEACHER,
          schoolId: {
            _id: "60d5ec49f1b2c8b1f8e4e1a2",
            name: "Apex International School",
          },
        };

        vi.spyOn(User, "findById").mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue({ ...testUser }),
          }),
        });

        const token = signAccessToken({
          sub: testUser._id,
          role: testUser.role,
          schoolId: "60d5ec49f1b2c8b1f8e4e1a2",
        });

        const res = await request(app)
          .get("/api/v1/auth/me")
          .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe("teacher@apexschool.com");
      });
    });

    describe("POST /api/v1/auth/logout", () => {
      it("should return 200 and clear the refresh cookie", async () => {
        vi.spyOn(RefreshToken, "updateOne").mockResolvedValue({});

        const res = await request(app).post("/api/v1/auth/logout");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const cookies = res.headers["set-cookie"];
        expect(cookies).toBeDefined();
        // Clear cookie sets expires in past or empty value
        expect(cookies.some((c) => c.includes("refreshToken=;"))).toBe(true);
      });
    });
  });
});

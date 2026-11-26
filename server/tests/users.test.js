import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { signAccessToken } from "../src/utils/tokens.js";
import { ROLES, USER_STATUS } from "../src/constants/index.js";
import { User } from "../src/modules/user/user.model.js";

describe("Unit 1: User Management & RBAC Protection", () => {
  const schoolId = "60d5ec49f1b2c8b1f8e4e1a2";

  const createToken = (role) =>
    signAccessToken({
      sub: "60d5ec49f1b2c8b1f8e4e1a1",
      role,
      schoolId,
    });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/v1/users (Listing users)", () => {
    it("should return 401 when unauthenticated", async () => {
      const res = await request(app).get("/api/v1/users");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("AUTH_REQUIRED");
    });

    it("should return 403 Forbidden when called by a teacher", async () => {
      const teacherToken = createToken(ROLES.TEACHER);
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("should return 403 Forbidden when called by a student or parent", async () => {
      const studentToken = createToken(ROLES.STUDENT);
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("should return 200 with user list when called by admin", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(User, "countDocuments").mockResolvedValue(1);
      vi.spyOn(User, "find").mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: "60d5ec49f1b2c8b1f8e4e1a1",
            email: "admin@apexschool.com",
            role: ROLES.ADMIN,
            status: USER_STATUS.ACTIVE,
          },
        ]),
      });

      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe("POST /api/v1/users (Creating user)", () => {
    it("should return 400 when body is invalid (missing email and phone)", async () => {
      const adminToken = createToken(ROLES.ADMIN);
      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          password: "Password123!",
          role: ROLES.TEACHER,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 403 when an admin tries to create a super_admin", async () => {
      const adminToken = createToken(ROLES.ADMIN);
      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: "newsuper@apexschool.com",
          password: "SuperSecret123!",
          role: ROLES.SUPER_ADMIN,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain("Only a super_admin can create another super_admin");
    });

    it("should return 201 when super_admin creates a teacher", async () => {
      const superAdminToken = createToken(ROLES.SUPER_ADMIN);

      vi.spyOn(User, "findOne").mockResolvedValue(null);
      vi.spyOn(User, "create").mockResolvedValue({
        _id: "60d5ec49f1b2c8b1f8e4e199",
        email: "newteacher@apexschool.com",
        role: ROLES.TEACHER,
        status: USER_STATUS.ACTIVE,
        toJSON: () => ({
          _id: "60d5ec49f1b2c8b1f8e4e199",
          email: "newteacher@apexschool.com",
          role: ROLES.TEACHER,
          status: USER_STATUS.ACTIVE,
        }),
      });

      const res = await request(app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          email: "newteacher@apexschool.com",
          password: "TeacherPassword123!",
          role: ROLES.TEACHER,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe("newteacher@apexschool.com");
    });
  });
});

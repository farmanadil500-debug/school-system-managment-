import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { signAccessToken } from "../src/utils/tokens.js";
import { ROLES } from "../src/constants/index.js";
import { Staff } from "../src/modules/staff/staff.model.js";
import { Section } from "../src/modules/academic/section.model.js";
import { TeachingAssignment } from "../src/modules/academic/teaching-assignment.model.js";
import * as counterModule from "../src/modules/counter/counter.model.js";

describe("Unit 4: Staff API", () => {
  const schoolId = "60d5ec49f1b2c8b1f8e4e1a2";
  const staffId = "60d5ec49f1b2c8b1f8e4e1b1";

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
    it("should return 401 when accessing staff endpoints unauthenticated", async () => {
      const res = await request(app).get("/api/v1/staff");
      expect(res.status).toBe(401);
    });

    it("should return 403 when a student attempts to list staff", async () => {
      const studentToken = createToken(ROLES.STUDENT);
      const res = await request(app)
        .get("/api/v1/staff")
        .set("Authorization", `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    it("should return 403 when a teacher attempts to create staff", async () => {
      const teacherToken = createToken(ROLES.TEACHER);
      const res = await request(app)
        .post("/api/v1/staff")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          name: "John Doe",
          phone: "+923001112233",
          staffType: "teacher",
        });
      expect(res.status).toBe(403);
    });

    it("should return 403 when a teacher attempts to delete staff", async () => {
      const teacherToken = createToken(ROLES.TEACHER);
      const res = await request(app)
        .delete(`/api/v1/staff/${staffId}`)
        .set("Authorization", `Bearer ${teacherToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/v1/staff (Create Staff)", () => {
    const validStaffPayload = {
      name: "Sir Ahmed Khan",
      staffType: "teacher",
      phone: "+923001234567",
      email: "ahmed.khan@apexschool.com",
      qualification: "M.Sc Mathematics",
      experience: "5 years",
      salary: 45000,
    };

    it("should return 400 when missing required fields", async () => {
      const adminToken = createToken(ROLES.ADMIN);
      const res = await request(app)
        .post("/api/v1/staff")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 201 and generate an employeeNo like EMP-001", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(counterModule, "getNextSequence").mockResolvedValue(1);

      vi.spyOn(Staff, "create").mockResolvedValue({
        _id: staffId,
        schoolId,
        employeeNo: "EMP-001",
        name: "Sir Ahmed Khan",
        staffType: "teacher",
        phone: "+923001234567",
        email: "ahmed.khan@apexschool.com",
        qualification: "M.Sc Mathematics",
        experience: "5 years",
        salary: 45000,
        status: "active",
        toJSON: () => ({
          _id: staffId,
          schoolId,
          employeeNo: "EMP-001",
          name: "Sir Ahmed Khan",
          staffType: "teacher",
          phone: "+923001234567",
          email: "ahmed.khan@apexschool.com",
          qualification: "M.Sc Mathematics",
          experience: "5 years",
          salary: 45000,
          status: "active",
        }),
      });

      const res = await request(app)
        .post("/api/v1/staff")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validStaffPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeNo).toBe("EMP-001");
      expect(res.body.data.name).toBe("Sir Ahmed Khan");
    });
  });

  describe("GET /api/v1/staff (List Staff Directory)", () => {
    it("should return 200 with staff list and linked assignments", async () => {
      const teacherToken = createToken(ROLES.TEACHER);

      vi.spyOn(Staff, "countDocuments").mockResolvedValue(1);

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: staffId,
            employeeNo: "EMP-001",
            name: "Sir Ahmed Khan",
            staffType: "teacher",
            phone: "+923001234567",
            status: "active",
            userId: null,
          },
        ]),
      };
      vi.spyOn(Staff, "find").mockReturnValue(mockQuery);

      const mockSectionQuery = {
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: "sec-1",
            name: "A",
            classTeacherId: staffId,
            classId: { _id: "cls-1", name: "Grade 10" },
          },
        ]),
      };
      vi.spyOn(Section, "find").mockReturnValue(mockSectionQuery);

      const mockAssignQuery = {
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: "asgn-1",
            staffId,
            subjectId: { name: "Mathematics", code: "MATH-10" },
            sectionId: { name: "A" },
          },
        ]),
      };
      vi.spyOn(TeachingAssignment, "find").mockReturnValue(mockAssignQuery);

      const res = await request(app)
        .get("/api/v1/staff")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].employeeNo).toBe("EMP-001");
      expect(res.body.data[0].classTeacherOf).toBe("Grade 10 - Sec A");
      expect(res.body.data[0].assignments).toHaveLength(1);
      expect(res.body.data[0].assignments[0].subject).toBe("Mathematics");
    });
  });

  describe("GET /api/v1/staff/:id (Single Staff Member)", () => {
    it("should return 404 when staff member does not exist", async () => {
      const adminToken = createToken(ROLES.ADMIN);
      const mockQuery = {
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.spyOn(Staff, "findOne").mockReturnValue(mockQuery);

      const res = await request(app)
        .get(`/api/v1/staff/${staffId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it("should return 200 with staff details when found", async () => {
      const adminToken = createToken(ROLES.ADMIN);
      const mockStaffDoc = {
        _id: staffId,
        schoolId,
        employeeNo: "EMP-001",
        name: "Sir Ahmed Khan",
        staffType: "teacher",
        phone: "+923001234567",
        status: "active",
      };

      const mockQuery = {
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockStaffDoc),
      };
      vi.spyOn(Staff, "findOne").mockReturnValue(mockQuery);

      vi.spyOn(Section, "find").mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      });

      vi.spyOn(TeachingAssignment, "find").mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      });

      const res = await request(app)
        .get(`/api/v1/staff/${staffId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.employeeNo).toBe("EMP-001");
      expect(res.body.data.name).toBe("Sir Ahmed Khan");
    });
  });

  describe("PATCH /api/v1/staff/:id (Update Staff)", () => {
    it("should return 200 and update staff attributes", async () => {
      const adminToken = createToken(ROLES.ADMIN);
      const existingStaff = {
        _id: staffId,
        schoolId,
        name: "Old Name",
        phone: "03000000000",
        status: "active",
        qualification: "B.Sc",
        save: vi.fn().mockResolvedValue(true),
        toJSON: () => ({
          _id: staffId,
          name: "Updated Name",
          phone: "03009999999",
          status: "active",
        }),
      };

      vi.spyOn(Staff, "findOne").mockResolvedValue(existingStaff);

      const res = await request(app)
        .patch(`/api/v1/staff/${staffId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Updated Name",
          phone: "03009999999",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Updated Name");
      expect(existingStaff.save).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/v1/staff/:id (Deactivate Staff)", () => {
    it("should return 200 and mark staff status as inactive", async () => {
      const adminToken = createToken(ROLES.ADMIN);
      const existingStaff = {
        _id: staffId,
        schoolId,
        name: "Sir Ahmed Khan",
        status: "active",
        userId: null,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Staff, "findOne").mockResolvedValue(existingStaff);

      const res = await request(app)
        .delete(`/api/v1/staff/${staffId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(existingStaff.status).toBe("inactive");
      expect(res.body.data.message).toContain("deactivated");
    });
  });
});

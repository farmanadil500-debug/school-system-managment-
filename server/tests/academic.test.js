import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { signAccessToken } from "../src/utils/tokens.js";
import { ROLES } from "../src/constants/index.js";
import { AcademicYear } from "../src/modules/academic/academic-year.model.js";
import { Class } from "../src/modules/academic/class.model.js";
import { Section } from "../src/modules/academic/section.model.js";
import { Subject } from "../src/modules/academic/subject.model.js";
import { School } from "../src/modules/school/school.model.js";

describe("Unit 2: Academic Structure & Settings API", () => {
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

  describe("Academic Years (/api/v1/academic/years)", () => {
    it("should return 401 when unauthenticated", async () => {
      const res = await request(app).get("/api/v1/academic/years");
      expect(res.status).toBe(401);
    });

    it("should return 200 with list of academic years for authenticated user", async () => {
      const teacherToken = createToken(ROLES.TEACHER);

      vi.spyOn(AcademicYear, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: "year-1",
              name: "2026-2027",
              startDate: new Date("2026-08-01"),
              endDate: new Date("2027-06-30"),
              isCurrent: true,
            },
          ]),
        }),
      });

      const res = await request(app)
        .get("/api/v1/academic/years")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe("2026-2027");
    });

    it("should return 403 when a student tries to create an academic year", async () => {
      const studentToken = createToken(ROLES.STUDENT);

      const res = await request(app)
        .post("/api/v1/academic/years")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          name: "2027-2028",
          startDate: "2027-08-01",
          endDate: "2028-06-30",
        });

      expect(res.status).toBe(403);
    });

    it("should return 201 when admin creates a new academic year", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(AcademicYear, "findOne").mockResolvedValue(null);
      vi.spyOn(AcademicYear, "create").mockResolvedValue({
        _id: "year-2",
        name: "2027-2028",
        startDate: new Date("2027-08-01"),
        endDate: new Date("2028-06-30"),
        isCurrent: true,
        terms: [],
        toJSON: () => ({
          _id: "year-2",
          name: "2027-2028",
          isCurrent: true,
        }),
      });
      vi.spyOn(AcademicYear, "updateMany").mockResolvedValue({});

      const res = await request(app)
        .post("/api/v1/academic/years")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "2027-2028",
          startDate: "2027-08-01",
          endDate: "2028-06-30",
          isCurrent: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("2027-2028");
    });
  });

  describe("Classes & Sections (/api/v1/academic/classes)", () => {
    it("should return 200 with classes and nested sections", async () => {
      const teacherToken = createToken(ROLES.TEACHER);

      vi.spyOn(Class, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([{ _id: "class-1", name: "Grade 6", order: 6 }]),
        }),
      });

      vi.spyOn(Section, "find").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            lean: vi
              .fn()
              .mockResolvedValue([{ _id: "sec-1", classId: "class-1", name: "A", capacity: 40 }]),
          }),
        }),
      });

      const res = await request(app)
        .get("/api/v1/academic/classes")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].sections.length).toBe(1);
      expect(res.body.data[0].sections[0].name).toBe("A");
    });

    it("should create a class when called by admin", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(Class, "findOne").mockResolvedValue(null);
      vi.spyOn(Class, "create").mockResolvedValue({
        _id: "class-2",
        name: "Grade 7",
        order: 7,
        toJSON: () => ({ _id: "class-2", name: "Grade 7", order: 7 }),
      });

      const res = await request(app)
        .post("/api/v1/academic/classes")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Grade 7", order: 7 });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("Grade 7");
    });
  });

  describe("Subjects (/api/v1/academic/subjects)", () => {
    it("should list all subjects for authenticated users", async () => {
      const teacherToken = createToken(ROLES.TEACHER);

      vi.spyOn(Subject, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([{ _id: "sub-1", name: "Mathematics", code: "MATH" }]),
        }),
      });

      const res = await request(app)
        .get("/api/v1/academic/subjects")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].code).toBe("MATH");
    });
  });

  describe("School Settings (/api/v1/school)", () => {
    it("should return school settings", async () => {
      const teacherToken = createToken(ROLES.TEACHER);

      vi.spyOn(School, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: schoolId,
          name: "Apex International School",
          settings: {
            currency: "PKR",
            timezone: "Asia/Karachi",
            feeDueDay: 10,
            lateFine: 500,
            attendanceEditDays: 2,
          },
        }),
      });

      const res = await request(app)
        .get("/api/v1/school")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Apex International School");
      expect(res.body.data.settings.currency).toBe("PKR");
    });

    it("should allow admin to update school settings", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      const mockSchool = {
        _id: schoolId,
        name: "Apex International School",
        settings: {
          currency: "PKR",
          attendanceEditDays: 2,
        },
        save: vi.fn().mockResolvedValue(true),
        toJSON: () => ({
          _id: schoolId,
          name: "Apex International School",
          settings: {
            currency: "PKR",
            attendanceEditDays: 3,
          },
        }),
      };

      vi.spyOn(School, "findById").mockResolvedValue(mockSchool);

      const res = await request(app)
        .patch("/api/v1/school")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          settings: {
            attendanceEditDays: 3,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.settings.attendanceEditDays).toBe(3);
    });
  });
});

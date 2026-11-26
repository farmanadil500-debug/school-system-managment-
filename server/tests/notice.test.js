import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { signAccessToken } from "../src/utils/tokens.js";
import { ROLES } from "../src/constants/index.js";
import { Notice } from "../src/modules/notice/notice.model.js";
import { Section } from "../src/modules/academic/section.model.js";
import { TeachingAssignment } from "../src/modules/academic/teaching-assignment.model.js";
import { Enrollment } from "../src/modules/student/enrollment.model.js";
import { Student } from "../src/modules/student/student.model.js";

describe("Unit 9: Notices & Communications API", () => {
  const schoolId = "60d5ec49f1b2c8b1f8e4e1a2";
  const classId = "60d5ec49f1b2c8b1f8e4e1a3";
  const sectionId = "60d5ec49f1b2c8b1f8e4e1a4";
  const unassignedSectionId = "60d5ec49f1b2c8b1f8e4e1a9";
  const teacherUserId = "60d5ec49f1b2c8b1f8e4e1b1";
  const otherTeacherUserId = "60d5ec49f1b2c8b1f8e4e1b2";
  const studentId = "60d5ec49f1b2c8b1f8e4e1c1";
  const guardianId = "60d5ec49f1b2c8b1f8e4e1g1";
  const noticeId = "60d5ec49f1b2c8b1f8e4e1f1";

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
    it("should return 401 when accessing notice endpoints unauthenticated", async () => {
      const res = await request(app).get("/api/v1/notices");
      expect(res.status).toBe(401);
    });

    it("should return 403 when a student tries to create a notice", async () => {
      const studentToken = createToken(ROLES.STUDENT, { studentId });
      const res = await request(app)
        .post("/api/v1/notices")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          title: "Student Announcement",
          body: "Trying to post a notice",
        });

      expect(res.status).toBe(403);
    });

    it("should return 403 when an accountant tries to create a notice", async () => {
      const accountantToken = createToken(ROLES.ACCOUNTANT);
      const res = await request(app)
        .post("/api/v1/notices")
        .set("Authorization", `Bearer ${accountantToken}`)
        .send({
          title: "Fee Reminder",
          body: "Fees are due soon",
        });

      expect(res.status).toBe(403);
    });
  });

  describe("Notice Creation & Teacher Scope Enforcement", () => {
    it("should return 201 when admin creates a school-wide notice", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(Notice, "create").mockResolvedValue({
        _id: noticeId,
        schoolId,
        title: "Annual Sports Day 2026",
        body: "The annual sports day will take place on December 15th.",
        audience: { roles: [ROLES.STUDENT, ROLES.PARENT], classIds: [], sectionIds: [] },
        status: "published",
        isPinned: true,
        createdBy: "60d5ec49f1b2c8b1f8e4e1a1",
      });

      vi.spyOn(Notice, "findById").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockResolvedValue({
              _id: noticeId,
              title: "Annual Sports Day 2026",
              status: "published",
              isPinned: true,
            }),
          }),
        }),
      });

      const res = await request(app)
        .post("/api/v1/notices")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Annual Sports Day 2026",
          body: "The annual sports day will take place on December 15th.",
          roles: [ROLES.STUDENT, ROLES.PARENT],
          isPinned: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Annual Sports Day 2026");
    });

    it("should return 403 when a teacher targets an unassigned section", async () => {
      const teacherToken = createToken(ROLES.TEACHER, {
        userId: teacherUserId,
        staffId: teacherUserId,
      });

      vi.spyOn(Section, "find").mockReturnValue({
        select: vi.fn().mockResolvedValue([]),
      });
      vi.spyOn(TeachingAssignment, "find").mockReturnValue({
        select: vi.fn().mockResolvedValue([]),
      });

      const res = await request(app)
        .post("/api/v1/notices")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          title: "Math Homework Due",
          body: "Submit exercises 4 to 6 tomorrow.",
          sectionIds: [unassignedSectionId],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain("assigned classes or sections");
    });

    it("should return 201 when teacher creates a notice for an assigned section", async () => {
      const teacherToken = createToken(ROLES.TEACHER, {
        userId: teacherUserId,
        staffId: teacherUserId,
      });

      // Teacher is class teacher of sectionId
      vi.spyOn(Section, "find").mockReturnValue({
        select: vi.fn().mockResolvedValue([{ _id: sectionId, classId }]),
      });
      vi.spyOn(TeachingAssignment, "find").mockReturnValue({
        select: vi.fn().mockResolvedValue([]),
      });

      vi.spyOn(Notice, "create").mockResolvedValue({
        _id: noticeId,
        schoolId,
        title: "Science Project Due",
        body: "Bring models to class on Monday.",
        audience: { roles: [ROLES.STUDENT], classIds: [], sectionIds: [sectionId] },
        status: "published",
        createdBy: teacherUserId,
      });

      vi.spyOn(Notice, "findById").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockResolvedValue({
              _id: noticeId,
              title: "Science Project Due",
            }),
          }),
        }),
      });

      const res = await request(app)
        .post("/api/v1/notices")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          title: "Science Project Due",
          body: "Bring models to class on Monday.",
          roles: [ROLES.STUDENT],
          sectionIds: [sectionId],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Science Project Due");
    });
  });

  describe("Audience Filtering & Feed Retrieval", () => {
    it("should return notices list with pagination meta for admin", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      const mockNotices = [
        {
          _id: "notice-1",
          title: "Pinned Announcement",
          body: "Important info",
          isPinned: true,
          publishedAt: new Date().toISOString(),
        },
        {
          _id: "notice-2",
          title: "Regular Notice",
          body: "General updates",
          isPinned: false,
          publishedAt: new Date().toISOString(),
        },
      ];

      vi.spyOn(Notice, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              populate: vi.fn().mockReturnValue({
                populate: vi.fn().mockReturnValue({
                  populate: vi.fn().mockReturnValue({
                    lean: vi.fn().mockResolvedValue(mockNotices),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      vi.spyOn(Notice, "countDocuments").mockResolvedValue(2);

      const res = await request(app)
        .get("/api/v1/notices?page=1&limit=20")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);
      expect(res.body.meta.page).toBe(1);
    });

    it("should filter notices for student based on student role and active enrollment class", async () => {
      const studentToken = createToken(ROLES.STUDENT, { studentId });

      vi.spyOn(Enrollment, "findOne").mockResolvedValue({
        _id: "enrollment-1",
        studentId,
        classId,
        outcome: "active",
      });

      vi.spyOn(Notice, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              populate: vi.fn().mockReturnValue({
                populate: vi.fn().mockReturnValue({
                  populate: vi.fn().mockReturnValue({
                    lean: vi.fn().mockResolvedValue([
                      {
                        _id: "notice-student",
                        title: "Exam Schedule Released",
                        audience: { roles: [ROLES.STUDENT], classIds: [classId] },
                      },
                    ]),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      vi.spyOn(Notice, "countDocuments").mockResolvedValue(1);

      const res = await request(app)
        .get("/api/v1/notices")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].title).toBe("Exam Schedule Released");
    });
  });

  describe("Update & Deletion with Ownership Checks", () => {
    it("should return 403 when a teacher attempts to delete another user's notice", async () => {
      const teacherToken = createToken(ROLES.TEACHER, {
        userId: teacherUserId,
        staffId: teacherUserId,
      });

      vi.spyOn(Notice, "findOne").mockResolvedValue({
        _id: noticeId,
        schoolId,
        createdBy: otherTeacherUserId, // created by someone else!
      });

      const res = await request(app)
        .delete(`/api/v1/notices/${noticeId}`)
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain("only delete notices they created");
    });

    it("should allow admin to delete any notice", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(Notice, "findOne").mockResolvedValue({
        _id: noticeId,
        schoolId,
        createdBy: otherTeacherUserId,
        toJSON: () => ({ _id: noticeId }),
      });

      vi.spyOn(Notice, "deleteOne").mockResolvedValue({ deletedCount: 1 });

      const res = await request(app)
        .delete(`/api/v1/notices/${noticeId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

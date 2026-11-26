import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { signAccessToken } from "../src/utils/tokens.js";
import { ROLES } from "../src/constants/index.js";
import { TimetableSlot } from "../src/modules/timetable/timetable-slot.model.js";
import { Enrollment } from "../src/modules/student/enrollment.model.js";
import { Student } from "../src/modules/student/student.model.js";

describe("Unit 8: Timetable & Clash Detection API", () => {
  const schoolId = "60d5ec49f1b2c8b1f8e4e1a2";
  const academicYearId = "60d5ec49f1b2c8b1f8e4e1a5";
  const classId = "60d5ec49f1b2c8b1f8e4e1a3";
  const sectionId = "60d5ec49f1b2c8b1f8e4e1a4";
  const otherSectionId = "60d5ec49f1b2c8b1f8e4e1a9";
  const subjectId = "60d5ec49f1b2c8b1f8e4e1a6";
  const staffId = "60d5ec49f1b2c8b1f8e4e1b1";
  const otherStaffId = "60d5ec49f1b2c8b1f8e4e1b2";
  const studentId = "60d5ec49f1b2c8b1f8e4e1c1";
  const slotId = "60d5ec49f1b2c8b1f8e4e1d1";

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
    it("should return 401 when accessing timetable endpoints without authentication", async () => {
      const res = await request(app).get(`/api/v1/timetables/section/${sectionId}`);
      expect(res.status).toBe(401);
    });

    it("should return 403 when a student tries to create a timetable slot", async () => {
      const studentToken = createToken(ROLES.STUDENT, { studentId });
      const res = await request(app)
        .post("/api/v1/timetables/slots")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          academicYearId,
          classId,
          sectionId,
          day: "monday",
          period: 1,
          startTime: "08:00",
          endTime: "08:45",
          subjectId,
          staffId,
        });

      expect(res.status).toBe(403);
    });

    it("should return 403 when a teacher tries to view another teacher's timetable", async () => {
      const teacherToken = createToken(ROLES.TEACHER, { staffId });
      const res = await request(app)
        .get(`/api/v1/timetables/teacher/${otherStaffId}`)
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });

    it("should return 403 when a student tries to view another section's timetable", async () => {
      const studentToken = createToken(ROLES.STUDENT, { studentId });

      vi.spyOn(Enrollment, "findOne").mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/v1/timetables/section/${otherSectionId}`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe("Clash Detection Invariants", () => {
    it("should return 409 Conflict when section already has a lesson in that period and day", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(TimetableSlot, "findOne").mockReturnValueOnce({
        populate: vi.fn().mockResolvedValue({
          _id: slotId,
          sectionId,
          day: "monday",
          period: 1,
          subjectId: { name: "Mathematics" },
        }),
      });

      const res = await request(app)
        .post("/api/v1/timetables/slots")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          academicYearId,
          classId,
          sectionId,
          day: "monday",
          period: 1,
          startTime: "08:00",
          endTime: "08:45",
          subjectId,
          staffId,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain("already has a class scheduled");
    });

    it("should return 409 Conflict when teacher is already booked in another class in that period", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      // First query (section clash check): not found
      vi.spyOn(TimetableSlot, "findOne")
        .mockReturnValueOnce({
          populate: vi.fn().mockResolvedValue(null),
        })
        // Second query (teacher clash check): found existing slot in another class
        .mockReturnValueOnce({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockResolvedValue({
              _id: "60d5ec49f1b2c8b1f8e4e1d2",
              staffId,
              day: "monday",
              period: 2,
              classId: { name: "Grade 9" },
              sectionId: { name: "B" },
            }),
          }),
        });

      const res = await request(app)
        .post("/api/v1/timetables/slots")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          academicYearId,
          classId,
          sectionId,
          day: "monday",
          period: 2,
          startTime: "08:45",
          endTime: "09:30",
          subjectId,
          staffId,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain("Teacher is already scheduled to teach");
    });
  });

  describe("Section & Teacher Timetable Retrieval", () => {
    it("should return sorted section timetable for authorized admin", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      const mockSlots = [
        {
          _id: "slot2",
          day: "monday",
          period: 2,
          startTime: "08:45",
          endTime: "09:30",
          subjectId: { name: "English", code: "ENG-10" },
          staffId: { name: "Jane Smith", employeeNo: "EMP-002" },
        },
        {
          _id: "slot1",
          day: "monday",
          period: 1,
          startTime: "08:00",
          endTime: "08:45",
          subjectId: { name: "Mathematics", code: "MTH-10" },
          staffId: { name: "John Doe", employeeNo: "EMP-001" },
        },
      ];

      vi.spyOn(TimetableSlot, "find").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              populate: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue(mockSlots),
              }),
            }),
          }),
        }),
      });

      const res = await request(app)
        .get(`/api/v1/timetables/section/${sectionId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].period).toBe(1); // sorted period 1 first
      expect(res.body.data[1].period).toBe(2);
    });

    it("should allow teacher to view their own schedule", async () => {
      const teacherToken = createToken(ROLES.TEACHER, { staffId });

      vi.spyOn(TimetableSlot, "find").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([
                {
                  _id: "slot1",
                  day: "tuesday",
                  period: 1,
                  subjectId: { name: "Physics" },
                  classId: { name: "Grade 10" },
                  sectionId: { name: "A" },
                },
              ]),
            }),
          }),
        }),
      });

      const res = await request(app)
        .get(`/api/v1/timetables/teacher/${staffId}`)
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].subjectId.name).toBe("Physics");
    });
  });

  describe("Slot Creation & Bulk Schedule Management", () => {
    it("should successfully create a valid slot when there are no clashes", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(TimetableSlot, "findOne")
        .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue(null) })
        .mockReturnValueOnce({
          populate: vi.fn().mockReturnValue({ populate: vi.fn().mockResolvedValue(null) }),
        });

      vi.spyOn(TimetableSlot, "create").mockResolvedValue({
        _id: slotId,
        schoolId,
        academicYearId,
        classId,
        sectionId,
        day: "wednesday",
        period: 3,
        startTime: "09:30",
        endTime: "10:15",
        subjectId,
        staffId,
        room: "Lab 1",
        toJSON: () => ({ _id: slotId }),
      });

      vi.spyOn(TimetableSlot, "findById").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              populate: vi.fn().mockResolvedValue({
                _id: slotId,
                day: "wednesday",
                period: 3,
                room: "Lab 1",
              }),
            }),
          }),
        }),
      });

      const res = await request(app)
        .post("/api/v1/timetables/slots")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          academicYearId,
          classId,
          sectionId,
          day: "wednesday",
          period: 3,
          startTime: "09:30",
          endTime: "10:15",
          subjectId,
          staffId,
          room: "Lab 1",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.period).toBe(3);
    });

    it("should return 400 when bulk schedule contains duplicate periods on the same day", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      const res = await request(app)
        .post("/api/v1/timetables/bulk")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          academicYearId,
          classId,
          sectionId,
          slots: [
            {
              day: "thursday",
              period: 1,
              startTime: "08:00",
              endTime: "08:45",
              subjectId,
              staffId,
            },
            {
              day: "thursday",
              period: 1, // Duplicate period 1 on thursday!
              startTime: "08:00",
              endTime: "08:45",
              subjectId,
              staffId: otherStaffId,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("Duplicate period");
    });

    it("should successfully delete an existing slot", async () => {
      const adminToken = createToken(ROLES.ADMIN);

      vi.spyOn(TimetableSlot, "findOne").mockResolvedValue({
        _id: slotId,
        schoolId,
        toJSON: () => ({ _id: slotId }),
      });
      vi.spyOn(TimetableSlot, "deleteOne").mockResolvedValue({ deletedCount: 1 });

      const res = await request(app)
        .delete(`/api/v1/timetables/slots/${slotId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

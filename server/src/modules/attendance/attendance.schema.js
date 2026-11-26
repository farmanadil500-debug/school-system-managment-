import { z } from "zod";
import { ATTENDANCE_STATUS_LIST } from "../../constants/index.js";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const monthRegex = /^\d{4}-\d{2}$/;

export const markAttendanceSchema = z.object({
  body: z.object({
    sectionId: z.string().min(1, "Section ID is required"),
    date: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format"),
    academicYearId: z.string().optional(),
    records: z
      .array(
        z.object({
          studentId: z.string().min(1, "Student ID is required"),
          status: z.enum(ATTENDANCE_STATUS_LIST, {
            errorMap: () => ({
              message: `Status must be one of: ${ATTENDANCE_STATUS_LIST.join(", ")}`,
            }),
          }),
          remarks: z.string().trim().optional().default(""),
        })
      )
      .min(1, "At least one student record is required to mark attendance"),
  }),
});

export const getSectionAttendanceSchema = z.object({
  query: z.object({
    sectionId: z.string().min(1, "Section ID is required"),
    date: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format"),
  }),
});

export const getAttendanceHistorySchema = z.object({
  query: z.object({
    sectionId: z.string().optional(),
    classId: z.string().optional(),
    startDate: z.string().regex(dateRegex, "Start date must be YYYY-MM-DD").optional(),
    endDate: z.string().regex(dateRegex, "End date must be YYYY-MM-DD").optional(),
    limit: z.coerce.number().int().positive().max(200).default(50),
  }),
});

export const getStudentAttendanceSchema = z.object({
  params: z.object({
    studentId: z.string().min(1, "Student ID is required"),
  }),
  query: z.object({
    month: z.string().regex(monthRegex, "Month must be YYYY-MM").optional(),
    academicYearId: z.string().optional(),
  }),
});

export const getLowAttendanceSchema = z.object({
  query: z.object({
    sectionId: z.string().optional(),
    academicYearId: z.string().optional(),
    threshold: z.coerce.number().min(1).max(100).default(75),
  }),
});

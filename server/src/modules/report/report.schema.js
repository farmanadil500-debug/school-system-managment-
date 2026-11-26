import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const periodRegex = /^\d{4}-\d{2}$/;

export const queryAttendanceReportSchema = z.object({
  query: z.object({
    academicYearId: z.string().optional(),
    classId: z.string().optional(),
    sectionId: z.string().optional(),
    startDate: z.string().regex(dateRegex, "Start date must be YYYY-MM-DD").optional(),
    endDate: z.string().regex(dateRegex, "End date must be YYYY-MM-DD").optional(),
  }),
});

export const queryFeeReportSchema = z.object({
  query: z.object({
    academicYearId: z.string().optional(),
    classId: z.string().optional(),
    period: z.string().regex(periodRegex, "Period must be YYYY-MM").optional(),
    status: z.enum(["unpaid", "partial", "paid", "cancelled"]).optional(),
  }),
});

export const queryExamReportSchema = z.object({
  query: z.object({
    examId: z.string().min(1, "Exam ID is required"),
    classId: z.string().optional(),
    sectionId: z.string().optional(),
  }),
});

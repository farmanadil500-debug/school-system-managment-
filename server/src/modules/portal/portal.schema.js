import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const studentParamSchema = z.object({
  params: z.object({
    studentId: z.string().regex(objectIdRegex, "Invalid student ID format"),
  }),
});

export const portalAttendanceSchema = z.object({
  params: z.object({
    studentId: z.string().regex(objectIdRegex, "Invalid student ID format"),
  }),
  query: z.object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format")
      .optional(),
  }),
});

export const portalFeeSchema = z.object({
  params: z.object({
    studentId: z.string().regex(objectIdRegex, "Invalid student ID format"),
  }),
  query: z.object({
    status: z.enum(["unpaid", "partial", "paid", "cancelled"]).optional(),
    period: z
      .string()
      .regex(/^\d{4}-\d{2}$/, "Period must be in YYYY-MM format")
      .optional(),
  }),
});

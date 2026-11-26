import { z } from "zod";

const monthRegex = /^\d{4}-\d{2}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createFeeStructureSchema = z.object({
  body: z.object({
    classId: z.string().min(1, "Class ID is required"),
    academicYearId: z.string().optional(),
    items: z
      .array(
        z.object({
          name: z.string().trim().min(1, "Fee item name is required"),
          amount: z.coerce.number().min(0, "Amount cannot be negative"),
          frequency: z.enum(["monthly", "one_time", "annual"]).default("monthly"),
        })
      )
      .min(1, "At least one fee item is required"),
  }),
});

export const generateVouchersSchema = z.object({
  body: z.object({
    period: z.string().regex(monthRegex, "Period must be in YYYY-MM format"),
    academicYearId: z.string().optional(),
    classId: z.string().optional(),
    dueDate: z.string().regex(dateRegex, "Due date must be YYYY-MM-DD format").optional(),
  }),
});

export const recordPaymentSchema = z.object({
  body: z.object({
    amount: z.coerce.number().positive("Payment amount must be greater than 0"),
    method: z.enum(["cash", "bank_transfer", "cheque", "online"], {
      errorMap: () => ({ message: "Method must be cash, bank_transfer, cheque, or online" }),
    }),
    reference: z.string().trim().optional().default(""),
    notes: z.string().trim().optional().default(""),
  }),
});

export const reversePaymentSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(3, "Reversal reason must be at least 3 characters"),
  }),
});

export const listVouchersSchema = z.object({
  query: z.object({
    period: z.string().regex(monthRegex).optional(),
    classId: z.string().optional(),
    sectionId: z.string().optional(),
    status: z.enum(["unpaid", "partial", "paid", "cancelled"]).optional(),
    q: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export const getDefaultersSchema = z.object({
  query: z.object({
    classId: z.string().optional(),
    sectionId: z.string().optional(),
    minDaysOverdue: z.coerce.number().int().min(0).default(0),
  }),
});

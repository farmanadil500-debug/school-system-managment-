import { z } from "zod";

export const updateSchoolSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    address: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    logoUrl: z.string().trim().optional(),
    settings: z
      .object({
        currency: z.string().trim().optional(),
        timezone: z.string().trim().optional(),
        gradingScheme: z.string().trim().optional(),
        feeDueDay: z.coerce.number().int().min(1).max(31).optional(),
        lateFine: z.coerce.number().int().min(0).optional(),
        attendanceEditDays: z.coerce.number().int().min(0).max(30).optional(),
      })
      .optional(),
  }),
});

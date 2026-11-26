import { z } from "zod";

export const createStaffSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Staff name is required"),
    staffType: z.enum(["teacher", "accountant", "admin", "support"], {
      errorMap: () => ({ message: "Staff type must be teacher, accountant, admin, or support" }),
    }),
    phone: z.string().trim().min(5, "Contact phone is required"),
    email: z.string().email("Invalid email format").optional().or(z.literal("")),
    qualification: z.string().trim().optional().default(""),
    experience: z.string().trim().optional().default(""),
    joinDate: z.coerce.date().optional(),
    salary: z.coerce.number().int().min(0).optional().default(0),
    createLoginAccount: z.boolean().optional().default(false),
    password: z.string().min(8, "Password must be at least 8 characters").optional(),
  }),
});

export const updateStaffSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    phone: z.string().trim().min(5).optional(),
    email: z.string().email().optional().or(z.literal("")),
    qualification: z.string().trim().optional(),
    experience: z.string().trim().optional(),
    status: z.enum(["active", "inactive", "on_leave", "terminated"]).optional(),
    salary: z.coerce.number().int().min(0).optional(),
  }),
});

export const listStaffSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    staffType: z.enum(["teacher", "accountant", "admin", "support"]).optional(),
    status: z.enum(["active", "inactive", "on_leave", "terminated"]).optional(),
    q: z.string().optional(),
  }),
});

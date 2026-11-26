import { z } from "zod";
import { ROLE_LIST, USER_STATUS_LIST } from "../../constants/index.js";

export const createUserSchema = z.object({
  body: z
    .object({
      email: z.string().email("Invalid email address").optional().or(z.literal("")),
      phone: z.string().trim().min(5, "Phone number is too short").optional().or(z.literal("")),
      password: z.string().min(8, "Password must be at least 8 characters"),
      role: z.enum(ROLE_LIST, {
        errorMap: () => ({ message: `Role must be one of: ${ROLE_LIST.join(", ")}` }),
      }),
      staffId: z.string().optional().nullable(),
      guardianId: z.string().optional().nullable(),
      studentId: z.string().optional().nullable(),
    })
    .refine(
      (data) => (data.email && data.email.length > 0) || (data.phone && data.phone.length > 0),
      {
        message: "At least one of email or phone number is required",
        path: ["email"],
      }
    ),
});

export const updateUserSchema = z.object({
  body: z.object({
    role: z.enum(ROLE_LIST).optional(),
    status: z.enum(USER_STATUS_LIST).optional(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
  }),
});

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    role: z.enum(ROLE_LIST).optional(),
    status: z.enum(USER_STATUS_LIST).optional(),
    q: z.string().optional(),
  }),
});

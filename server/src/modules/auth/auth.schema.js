import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    identifier: z
      .string({ required_error: "Email or phone number is required" })
      .trim()
      .min(1, "Email or phone number cannot be empty"),
    password: z
      .string({ required_error: "Password is required" })
      .min(1, "Password cannot be empty"),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
  }),
});

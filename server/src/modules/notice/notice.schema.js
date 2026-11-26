import { z } from "zod";
import { ROLE_LIST } from "../../constants/index.js";

export const createNoticeSchema = z.object({
  body: z.object({
    title: z
      .string()
      .trim()
      .min(1, "Notice title is required")
      .max(200, "Title cannot exceed 200 characters"),
    body: z.string().trim().min(1, "Notice body content is required"),
    roles: z.array(z.enum(ROLE_LIST)).optional().default([]),
    classIds: z.array(z.string()).optional().default([]),
    sectionIds: z.array(z.string()).optional().default([]),
    publishedAt: z
      .string()
      .datetime()
      .optional()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
      .optional(),
    expiresAt: z
      .string()
      .datetime()
      .optional()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
      .nullable()
      .optional(),
    status: z.enum(["draft", "published", "archived"]).optional().default("published"),
    isPinned: z.boolean().optional().default(false),
    attachmentUrl: z.string().trim().optional().default(""),
  }),
});

export const updateNoticeSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1).max(200).optional(),
      body: z.string().trim().min(1).optional(),
      roles: z.array(z.enum(ROLE_LIST)).optional(),
      classIds: z.array(z.string()).optional(),
      sectionIds: z.array(z.string()).optional(),
      publishedAt: z.string().optional(),
      expiresAt: z.string().nullable().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
      isPinned: z.boolean().optional(),
      attachmentUrl: z.string().trim().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
});

export const queryNoticeSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["draft", "published", "archived"]).optional(),
    q: z.string().trim().optional(),
    role: z.string().optional(),
    classId: z.string().optional(),
  }),
});

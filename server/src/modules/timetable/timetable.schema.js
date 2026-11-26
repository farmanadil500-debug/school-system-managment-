import { z } from "zod";
import { DAYS_OF_WEEK } from "../../constants/index.js";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createSlotSchema = z.object({
  body: z.object({
    academicYearId: z.string().min(1, "Academic year ID is required"),
    classId: z.string().min(1, "Class ID is required"),
    sectionId: z.string().min(1, "Section ID is required"),
    day: z.enum(DAYS_OF_WEEK, {
      errorMap: () => ({ message: `Day must be one of: ${DAYS_OF_WEEK.join(", ")}` }),
    }),
    period: z.coerce
      .number()
      .int()
      .min(1, "Period must be at least 1")
      .max(12, "Period cannot exceed 12"),
    startTime: z.string().regex(timeRegex, "Start time must be in HH:MM format (e.g. 08:30)"),
    endTime: z.string().regex(timeRegex, "End time must be in HH:MM format (e.g. 09:15)"),
    subjectId: z.string().min(1, "Subject ID is required"),
    staffId: z.string().min(1, "Staff/Teacher ID is required"),
    room: z.string().trim().optional().default(""),
  }),
});

export const updateSlotSchema = z.object({
  body: z
    .object({
      day: z.enum(DAYS_OF_WEEK).optional(),
      period: z.coerce.number().int().min(1).max(12).optional(),
      startTime: z.string().regex(timeRegex, "Start time must be in HH:MM format").optional(),
      endTime: z.string().regex(timeRegex, "End time must be in HH:MM format").optional(),
      subjectId: z.string().min(1).optional(),
      staffId: z.string().min(1).optional(),
      room: z.string().trim().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
});

export const bulkSaveSlotsSchema = z.object({
  body: z.object({
    academicYearId: z.string().min(1, "Academic year ID is required"),
    classId: z.string().min(1, "Class ID is required"),
    sectionId: z.string().min(1, "Section ID is required"),
    day: z.enum(DAYS_OF_WEEK).optional(),
    slots: z.array(
      z.object({
        day: z.enum(DAYS_OF_WEEK),
        period: z.coerce.number().int().min(1).max(12),
        startTime: z.string().regex(timeRegex, "Start time must be HH:MM"),
        endTime: z.string().regex(timeRegex, "End time must be HH:MM"),
        subjectId: z.string().min(1, "Subject ID is required"),
        staffId: z.string().min(1, "Teacher/Staff ID is required"),
        room: z.string().trim().optional().default(""),
      })
    ),
  }),
});

export const queryTimetableSchema = z.object({
  query: z.object({
    academicYearId: z.string().optional(),
    day: z.enum(DAYS_OF_WEEK).optional(),
  }),
});

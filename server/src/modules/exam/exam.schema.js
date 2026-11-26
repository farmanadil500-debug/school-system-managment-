import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createExamSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Exam title is required"),
    termName: z.string().trim().min(1, "Term name is required"),
    classIds: z.array(z.string()).optional().default([]),
    academicYearId: z.string().optional(),
    startDate: z
      .string()
      .regex(dateRegex, "Start date must be YYYY-MM-DD")
      .optional()
      .or(z.literal("")),
    endDate: z
      .string()
      .regex(dateRegex, "End date must be YYYY-MM-DD")
      .optional()
      .or(z.literal("")),
  }),
});

export const updateExamSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    termName: z.string().trim().min(1).optional(),
    classIds: z.array(z.string()).optional(),
    startDate: z.string().regex(dateRegex).optional().or(z.literal("")),
    endDate: z.string().regex(dateRegex).optional().or(z.literal("")),
    status: z.enum(["draft", "scheduled", "marking", "locked", "published"]).optional(),
  }),
});

export const addExamSubjectSchema = z.object({
  body: z.object({
    classId: z.string().min(1, "Class ID is required"),
    subjectId: z.string().min(1, "Subject ID is required"),
    date: z.string().regex(dateRegex).optional().or(z.literal("")),
    totalMarks: z.coerce.number().positive("Total marks must be greater than 0").default(100),
    passingMarks: z.coerce.number().min(0, "Passing marks cannot be negative").default(33),
  }),
});

export const enterMarksSchema = z.object({
  body: z.object({
    subjectId: z.string().min(1, "Subject ID is required"),
    sectionId: z.string().min(1, "Section ID is required"),
    marks: z
      .array(
        z.object({
          studentId: z.string().min(1, "Student ID is required"),
          marksObtained: z.coerce.number().min(0, "Marks cannot be negative").default(0),
          isAbsent: z.boolean().optional().default(false),
          remarks: z.string().trim().optional().default(""),
        })
      )
      .min(1, "At least one student mark is required"),
  }),
});

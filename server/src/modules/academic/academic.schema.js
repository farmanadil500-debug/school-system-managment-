import { z } from "zod";

const termSchema = z.object({
  name: z.string().trim().min(1, "Term name is required"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const createAcademicYearSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Academic year name is required"),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    isCurrent: z.boolean().optional().default(false),
    terms: z.array(termSchema).optional().default([]),
  }),
});

export const updateAcademicYearSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    isCurrent: z.boolean().optional(),
    terms: z.array(termSchema).optional(),
  }),
});

export const createClassSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Class name is required"),
    order: z.coerce.number().int().positive().optional().default(1),
  }),
});

export const updateClassSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    order: z.coerce.number().int().positive().optional(),
  }),
});

export const createSectionSchema = z.object({
  body: z.object({
    classId: z.string().min(1, "Class ID is required"),
    name: z.string().trim().min(1, "Section name is required"),
    classTeacherId: z.string().optional().nullable(),
    capacity: z.coerce.number().int().min(1).max(200).optional().default(40),
  }),
});

export const updateSectionSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    classTeacherId: z.string().optional().nullable(),
    capacity: z.coerce.number().int().min(1).max(200).optional(),
  }),
});

export const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Subject name is required"),
    code: z.string().trim().min(1, "Subject code is required"),
  }),
});

export const updateSubjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    code: z.string().trim().min(1).optional(),
  }),
});

export const createTeachingAssignmentSchema = z.object({
  body: z.object({
    academicYearId: z.string().min(1, "Academic year ID is required"),
    sectionId: z.string().min(1, "Section ID is required"),
    subjectId: z.string().min(1, "Subject ID is required"),
    staffId: z.string().min(1, "Staff/Teacher ID is required"),
  }),
});

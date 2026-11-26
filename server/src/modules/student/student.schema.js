import { z } from "zod";

export const admitStudentSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Student name is required"),
    dob: z.coerce.date({ required_error: "Date of birth is required" }),
    gender: z.enum(["male", "female", "other"], {
      errorMap: () => ({ message: "Gender must be male, female, or other" }),
    }),
    address: z.string().trim().optional().default(""),
    bloodGroup: z.string().trim().optional().default(""),
    emergencyPhone: z.string().trim().optional().default(""),
    admissionDate: z.coerce.date().optional(),
    classId: z.string().min(1, "Class is required"),
    sectionId: z.string().min(1, "Section is required"),
    academicYearId: z.string().optional(),
    rollNo: z.coerce.number().int().positive().optional(),
    guardian: z.object({
      name: z.string().trim().min(1, "Guardian name is required"),
      relation: z.enum(["father", "mother", "guardian", "other"]).optional().default("father"),
      phone: z.string().trim().min(5, "Guardian phone is required"),
      email: z.string().email().optional().or(z.literal("")),
      occupation: z.string().trim().optional().default(""),
      cnic: z.string().trim().optional().default(""),
    }),
    createParentLogin: z.boolean().optional().default(false),
    createStudentLogin: z.boolean().optional().default(false),
  }),
});

export const updateStudentSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    dob: z.coerce.date().optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    address: z.string().trim().optional(),
    bloodGroup: z.string().trim().optional(),
    emergencyPhone: z.string().trim().optional(),
    status: z.enum(["active", "inactive", "graduated", "expelled", "withdrawn"]).optional(),
  }),
});

export const promoteStudentsSchema = z.object({
  body: z.object({
    studentIds: z.array(z.string().min(1)).min(1, "At least one student must be selected"),
    targetAcademicYearId: z.string().min(1, "Target academic year is required"),
    targetClassId: z.string().min(1, "Target class is required"),
    targetSectionId: z.string().min(1, "Target section is required"),
    outcome: z.enum(["promoted", "repeated"]).optional().default("promoted"),
  }),
});

export const listStudentsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    classId: z.string().optional(),
    sectionId: z.string().optional(),
    academicYearId: z.string().optional(),
    status: z.string().optional(),
    q: z.string().optional(),
  }),
});

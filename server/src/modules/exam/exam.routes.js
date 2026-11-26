import { Router } from "express";
import { ExamController } from "./exam.controller.js";
import {
  createExamSchema,
  updateExamSchema,
  addExamSubjectSchema,
  enterMarksSchema,
} from "./exam.schema.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ROLES } from "../../constants/index.js";

const router = Router();

router.use(authenticate);

// 1. Exam CRUD & Listing
router.get(
  "/",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT),
  asyncHandler(ExamController.getExams)
);

router.post(
  "/",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(createExamSchema),
  asyncHandler(ExamController.createExam)
);

router.get(
  "/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT),
  asyncHandler(ExamController.getExamById)
);

router.patch(
  "/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(updateExamSchema),
  asyncHandler(ExamController.updateExam)
);

// 2. Exam Subjects Schedule
router.post(
  "/:id/subjects",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(addExamSubjectSchema),
  asyncHandler(ExamController.addExamSubject)
);

// 3. Marks Entry & Locking Protection
router.post(
  "/:id/marks",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
  validate(enterMarksSchema),
  asyncHandler(ExamController.enterMarks)
);

router.get(
  "/:id/sections/:sectionId/subjects/:subjectId/marks",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
  asyncHandler(ExamController.getSectionMarks)
);

// 4. Report Card View (Published results for parents/students, preview for admins/teachers)
router.get(
  "/:id/students/:studentId/report-card",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT),
  asyncHandler(ExamController.getStudentReportCard)
);

export default router;

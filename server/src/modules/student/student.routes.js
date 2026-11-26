import { Router } from "express";
import { StudentController } from "./student.controller.js";
import {
  admitStudentSchema,
  updateStudentSchema,
  promoteStudentsSchema,
  listStudentsSchema,
} from "./student.schema.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ROLES } from "../../constants/index.js";

const router = Router();

router.use(authenticate);

// Student directory list
router.get("/", validate(listStudentsSchema), asyncHandler(StudentController.listStudents));

// CSV Export
router.get("/export/csv", asyncHandler(StudentController.exportCSV));

// Admission (Super Admin & Admin)
router.post(
  "/admission",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(admitStudentSchema),
  asyncHandler(StudentController.admitStudent)
);

// Promotion & Repeat Flow (Super Admin & Admin)
router.post(
  "/promote",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(promoteStudentsSchema),
  asyncHandler(StudentController.promoteStudents)
);

// Single Student Profile
router.get("/:id", asyncHandler(StudentController.getStudentById));

// Update Student Info (Super Admin & Admin)
router.patch(
  "/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(updateStudentSchema),
  asyncHandler(StudentController.updateStudent)
);

export default router;

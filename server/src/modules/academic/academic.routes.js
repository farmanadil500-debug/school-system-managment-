import { Router } from "express";
import { AcademicController } from "./academic.controller.js";
import {
  createAcademicYearSchema,
  updateAcademicYearSchema,
  createClassSchema,
  updateClassSchema,
  createSectionSchema,
  updateSectionSchema,
  createSubjectSchema,
  updateSubjectSchema,
  createTeachingAssignmentSchema,
} from "./academic.schema.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ROLES } from "../../constants/index.js";

const router = Router();

// All academic routes require an authenticated user
router.use(authenticate);

// ─── Academic Years ──────────────────────────────────────────────────────────
router.get("/years", asyncHandler(AcademicController.listYears));
router.get("/years/current", asyncHandler(AcademicController.getCurrentYear));
router.post(
  "/years",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(createAcademicYearSchema),
  asyncHandler(AcademicController.createYear)
);
router.patch(
  "/years/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(updateAcademicYearSchema),
  asyncHandler(AcademicController.updateYear)
);

// ─── Classes ─────────────────────────────────────────────────────────────────
router.get("/classes", asyncHandler(AcademicController.listClasses));
router.post(
  "/classes",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(createClassSchema),
  asyncHandler(AcademicController.createClass)
);
router.patch(
  "/classes/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(updateClassSchema),
  asyncHandler(AcademicController.updateClass)
);
router.delete(
  "/classes/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  asyncHandler(AcademicController.deleteClass)
);

// ─── Sections ────────────────────────────────────────────────────────────────
router.get("/sections", asyncHandler(AcademicController.listSections));
router.post(
  "/sections",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(createSectionSchema),
  asyncHandler(AcademicController.createSection)
);
router.patch(
  "/sections/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(updateSectionSchema),
  asyncHandler(AcademicController.updateSection)
);
router.delete(
  "/sections/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  asyncHandler(AcademicController.deleteSection)
);

// ─── Subjects ────────────────────────────────────────────────────────────────
router.get("/subjects", asyncHandler(AcademicController.listSubjects));
router.post(
  "/subjects",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(createSubjectSchema),
  asyncHandler(AcademicController.createSubject)
);
router.patch(
  "/subjects/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(updateSubjectSchema),
  asyncHandler(AcademicController.updateSubject)
);
router.delete(
  "/subjects/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  asyncHandler(AcademicController.deleteSubject)
);

// ─── Teaching Assignments ────────────────────────────────────────────────────
router.get("/assignments", asyncHandler(AcademicController.listAssignments));
router.post(
  "/assignments",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(createTeachingAssignmentSchema),
  asyncHandler(AcademicController.createAssignment)
);
router.delete(
  "/assignments/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  asyncHandler(AcademicController.deleteAssignment)
);

export default router;

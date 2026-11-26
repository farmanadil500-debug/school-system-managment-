import { Router } from "express";
import { TimetableController } from "./timetable.controller.js";
import {
  createSlotSchema,
  updateSlotSchema,
  bulkSaveSlotsSchema,
  queryTimetableSchema,
} from "./timetable.schema.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ROLES } from "../../constants/index.js";

const router = Router();

router.use(authenticate);

// 1. Get Section Timetable (Admin, Teachers, Section Students, Enrolled Parents)
router.get(
  "/section/:sectionId",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT),
  validate(queryTimetableSchema),
  asyncHandler(TimetableController.getSectionTimetable)
);

// 2. Get Teacher Timetable (Admin, Teacher viewing own schedule)
router.get(
  "/teacher/:staffId",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
  validate(queryTimetableSchema),
  asyncHandler(TimetableController.getTeacherTimetable)
);

// 3. Create single slot (Admin/Super Admin only)
router.post(
  "/slots",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(createSlotSchema),
  asyncHandler(TimetableController.createSlot)
);

// 4. Update single slot (Admin/Super Admin only)
router.patch(
  "/slots/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(updateSlotSchema),
  asyncHandler(TimetableController.updateSlot)
);

// 5. Bulk save / replace section timetable (Admin/Super Admin only)
router.post(
  "/bulk",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(bulkSaveSlotsSchema),
  asyncHandler(TimetableController.bulkSaveSectionTimetable)
);

// 6. Delete single slot (Admin/Super Admin only)
router.delete(
  "/slots/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  asyncHandler(TimetableController.deleteSlot)
);

export default router;

import { Router } from "express";
import { StaffController } from "./staff.controller.js";
import { createStaffSchema, updateStaffSchema, listStaffSchema } from "./staff.schema.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ROLES } from "../../constants/index.js";

const router = Router();

router.use(authenticate);

// List staff directory (Staff members can view directory, admins manage)
router.get(
  "/",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.ACCOUNTANT),
  validate(listStaffSchema),
  asyncHandler(StaffController.listStaff)
);

// Create new staff profile (Admin & Super Admin)
router.post(
  "/",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(createStaffSchema),
  asyncHandler(StaffController.createStaff)
);

// Single staff profile
router.get(
  "/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.ACCOUNTANT),
  asyncHandler(StaffController.getStaffById)
);

// Update staff details (Admin & Super Admin)
router.patch(
  "/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(updateStaffSchema),
  asyncHandler(StaffController.updateStaff)
);

// Deactivate staff profile (Admin & Super Admin)
router.delete(
  "/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  asyncHandler(StaffController.deleteStaff)
);

export default router;

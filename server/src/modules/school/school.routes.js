import { Router } from "express";
import { SchoolController } from "./school.controller.js";
import { updateSchoolSchema } from "./school.schema.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ROLES } from "../../constants/index.js";

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(SchoolController.getSchool));
router.patch(
  "/",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(updateSchoolSchema),
  asyncHandler(SchoolController.updateSchool)
);

export default router;

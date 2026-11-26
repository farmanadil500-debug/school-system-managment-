import { Router } from "express";
import { UserController } from "./user.controller.js";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  listUsersSchema,
} from "./user.schema.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ROLES } from "../../constants/index.js";

const router = Router();

// All user management routes require authenticated Super Admin or Admin
router.use(authenticate, requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN));

router.get("/", validate(listUsersSchema), asyncHandler(UserController.listUsers));
router.post("/", validate(createUserSchema), asyncHandler(UserController.createUser));
router.get("/:id", asyncHandler(UserController.getUserById));
router.patch("/:id", validate(updateUserSchema), asyncHandler(UserController.updateUser));
router.post(
  "/:id/reset-password",
  validate(resetPasswordSchema),
  asyncHandler(UserController.resetPassword)
);

export default router;

import { Router } from "express";
import { NoticeController } from "./notice.controller.js";
import { createNoticeSchema, updateNoticeSchema, queryNoticeSchema } from "./notice.schema.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ROLES } from "../../constants/index.js";

const router = Router();

router.use(authenticate);

// 1. List Notices (Accessible to all authenticated roles with audience filtering)
router.get(
  "/",
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.TEACHER,
    ROLES.ACCOUNTANT,
    ROLES.STUDENT,
    ROLES.PARENT
  ),
  validate(queryNoticeSchema),
  asyncHandler(NoticeController.getNotices)
);

// 2. Get Single Notice
router.get(
  "/:id",
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.TEACHER,
    ROLES.ACCOUNTANT,
    ROLES.STUDENT,
    ROLES.PARENT
  ),
  asyncHandler(NoticeController.getNoticeById)
);

// 3. Create Notice (Super Admin, Admin, Teachers)
router.post(
  "/",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
  validate(createNoticeSchema),
  asyncHandler(NoticeController.createNotice)
);

// 4. Update Notice (Super Admin, Admin, Teachers for own notices)
router.patch(
  "/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
  validate(updateNoticeSchema),
  asyncHandler(NoticeController.updateNotice)
);

// 5. Delete Notice (Super Admin, Admin, Teachers for own notices)
router.delete(
  "/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
  asyncHandler(NoticeController.deleteNotice)
);

export default router;

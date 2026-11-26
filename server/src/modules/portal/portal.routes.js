import { Router } from "express";
import { PortalController } from "./portal.controller.js";
import { studentParamSchema, portalAttendanceSchema, portalFeeSchema } from "./portal.schema.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ROLES } from "../../constants/index.js";

const router = Router();

router.use(authenticate);
router.use(requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STUDENT, ROLES.PARENT));

// 1. Get current user's children list (or current student's self profile)
router.get("/children", asyncHandler(PortalController.getMyChildren));

// 2. Get student profile & enrollment
router.get(
  "/student/:studentId",
  validate(studentParamSchema),
  asyncHandler(PortalController.getStudentProfile)
);

// 3. Get student attendance log & statistics
router.get(
  "/student/:studentId/attendance",
  validate(portalAttendanceSchema),
  asyncHandler(PortalController.getStudentAttendance)
);

// 4. Get student fees, vouchers & receipts
router.get(
  "/student/:studentId/fees",
  validate(portalFeeSchema),
  asyncHandler(PortalController.getStudentFees)
);

// 5. Get student weekly timetable schedule
router.get(
  "/student/:studentId/timetable",
  validate(studentParamSchema),
  asyncHandler(PortalController.getStudentTimetable)
);

// 6. Get published exams & report cards for student
router.get(
  "/student/:studentId/exams",
  validate(studentParamSchema),
  asyncHandler(PortalController.getStudentExams)
);

// 7. Get student-targeted notices
router.get(
  "/student/:studentId/notices",
  validate(studentParamSchema),
  asyncHandler(PortalController.getStudentNotices)
);

export default router;

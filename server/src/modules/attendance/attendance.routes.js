import { Router } from "express";
import { AttendanceController } from "./attendance.controller.js";
import {
  markAttendanceSchema,
  getSectionAttendanceSchema,
  getAttendanceHistorySchema,
  getStudentAttendanceSchema,
  getLowAttendanceSchema,
} from "./attendance.schema.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ROLES } from "../../constants/index.js";

const router = Router();

router.use(authenticate);

// 1. Mark Section Attendance (Super Admin, Admin, Teacher)
router.post(
  "/bulk",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
  validate(markAttendanceSchema),
  asyncHandler(AttendanceController.markSectionAttendance)
);

// 2. Get Section Attendance Sheet for a given date
router.get(
  "/section",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
  validate(getSectionAttendanceSchema),
  asyncHandler(AttendanceController.getSectionAttendance)
);

// 3. Get Attendance History across dates for classes/sections
router.get(
  "/history",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
  validate(getAttendanceHistorySchema),
  asyncHandler(AttendanceController.getAttendanceHistory)
);

// 4. Low Attendance Warning List (Admins and Teachers)
router.get(
  "/low-attendance",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
  validate(getLowAttendanceSchema),
  asyncHandler(AttendanceController.getLowAttendanceList)
);

// 5. Individual Student Attendance Summary & Daily Log
router.get(
  "/student/:studentId",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT),
  validate(getStudentAttendanceSchema),
  asyncHandler(AttendanceController.getStudentAttendance)
);

export default router;

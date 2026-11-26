import { Router } from "express";
import { ReportController } from "./report.controller.js";
import {
  queryAttendanceReportSchema,
  queryFeeReportSchema,
  queryExamReportSchema,
} from "./report.schema.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ROLES } from "../../constants/index.js";

const router = Router();

router.use(authenticate);

// 1. Attendance Reports & CSV Export (Super Admin, Admin, Teachers for own sections)
router.get(
  "/attendance",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
  validate(queryAttendanceReportSchema),
  asyncHandler(ReportController.getAttendanceReport)
);

router.get(
  "/attendance/export/csv",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
  validate(queryAttendanceReportSchema),
  asyncHandler(ReportController.exportAttendanceReportCSV)
);

// 2. Fees & Revenue Reports & CSV Export (Super Admin, Admin, Accountants)
router.get(
  "/fees",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT),
  validate(queryFeeReportSchema),
  asyncHandler(ReportController.getFeeReport)
);

router.get(
  "/fees/export/csv",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT),
  validate(queryFeeReportSchema),
  asyncHandler(ReportController.exportFeeReportCSV)
);

// 3. Academic Exams & Grading Analytics (Super Admin, Admin, Teachers for own sections)
router.get(
  "/exams",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
  validate(queryExamReportSchema),
  asyncHandler(ReportController.getExamReport)
);

router.get(
  "/exams/export/csv",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
  validate(queryExamReportSchema),
  asyncHandler(ReportController.exportExamReportCSV)
);

export default router;

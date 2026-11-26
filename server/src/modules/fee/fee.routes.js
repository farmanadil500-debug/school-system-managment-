import { Router } from "express";
import { FeeController } from "./fee.controller.js";
import {
  createFeeStructureSchema,
  generateVouchersSchema,
  recordPaymentSchema,
  reversePaymentSchema,
  listVouchersSchema,
  getDefaultersSchema,
} from "./fee.schema.js";
import { validate } from "../../middleware/validate.js";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { ROLES } from "../../constants/index.js";

const router = Router();

router.use(authenticate);

// 1. Fee Structures (Class fee items)
router.get(
  "/structures",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT),
  asyncHandler(FeeController.getFeeStructures)
);

router.post(
  "/structures",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(createFeeStructureSchema),
  asyncHandler(FeeController.createFeeStructure)
);

// 2. Generate Monthly Vouchers (Accountant, Admin, Super Admin)
router.post(
  "/vouchers/generate",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT),
  validate(generateVouchersSchema),
  asyncHandler(FeeController.generateVouchers)
);

// 3. List Vouchers (Filterable, Paginated)
router.get(
  "/vouchers",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT),
  validate(listVouchersSchema),
  asyncHandler(FeeController.listVouchers)
);

// 4. Defaulters / Overdue Report
router.get(
  "/defaulters",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT),
  validate(getDefaultersSchema),
  asyncHandler(FeeController.getDefaulters)
);

// 5. Single Voucher Details & Payment History
router.get(
  "/vouchers/:id",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.STUDENT, ROLES.PARENT),
  asyncHandler(FeeController.getVoucherById)
);

// 6. Record Payment Collection (Receipt Generation)
router.post(
  "/vouchers/:id/payments",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT),
  validate(recordPaymentSchema),
  asyncHandler(FeeController.recordPayment)
);

// 7. Payment Reversal (Audit-logged)
router.post(
  "/payments/:paymentId/reverse",
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT),
  validate(reversePaymentSchema),
  asyncHandler(FeeController.reversePayment)
);

export default router;

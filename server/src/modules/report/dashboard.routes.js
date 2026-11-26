import { Router } from "express";
import { ReportController } from "./report.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";

const router = Router();

router.use(authenticate);

// Role-aware live dashboard aggregates
router.get("/stats", asyncHandler(ReportController.getDashboardStats));

export default router;

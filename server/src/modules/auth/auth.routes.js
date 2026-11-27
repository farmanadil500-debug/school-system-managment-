import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "./auth.controller.js";
import { loginSchema, changePasswordSchema } from "./auth.schema.js";
import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";

const router = Router();

// Strict rate limit on sensitive authentication routes (e.g. 10 requests per 15 min per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts. Please try again after 15 minutes.",
    },
  },
});

// Public auth routes with strict rate limiting
router.post("/login", authLimiter, validate(loginSchema), asyncHandler(AuthController.login));
router.post("/refresh", authLimiter, asyncHandler(AuthController.refresh));
router.post("/logout", asyncHandler(AuthController.logout));

// Authenticated user routes
router.get("/me", authenticate, asyncHandler(AuthController.getMe));
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(AuthController.changePassword)
);

export default router;

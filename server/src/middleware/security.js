import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

// 1. HTTP Security Headers
export const securityHeaders = helmet();

// 2. Strict CORS allow-list per architecture.md
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (like server-to-server or tests) or whitelisted browser origins
    if (!origin || env.CLIENT_ORIGINS.includes(origin) || env.NODE_ENV !== "production") {
      return callback(null, true);
    }
    callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// 3. Global light rate-limiter for API routes
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests from this IP, please try again later",
    },
  },
});

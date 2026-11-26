import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { securityHeaders, corsMiddleware, globalRateLimiter } from "./middleware/security.js";
import { httpLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { ApiError } from "./utils/api-error.js";

// Production Modules
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import academicRoutes from "./modules/academic/academic.routes.js";
import schoolRoutes from "./modules/school/school.routes.js";
import studentRoutes from "./modules/student/student.routes.js";
import staffRoutes from "./modules/staff/staff.routes.js";
import attendanceRoutes from "./modules/attendance/attendance.routes.js";
import feeRoutes from "./modules/fee/fee.routes.js";
import examRoutes from "./modules/exam/exam.routes.js";
import timetableRoutes from "./modules/timetable/timetable.routes.js";
import noticeRoutes from "./modules/notice/notice.routes.js";
import reportRoutes from "./modules/report/report.routes.js";
import dashboardRoutes from "./modules/report/dashboard.routes.js";
import portalRoutes from "./modules/portal/portal.routes.js";

// Legacy routes preserved for backward compatibility
import legacyStudentRoutes from "../routes/studentRoutes.js";
import legacyAttendanceRoutes from "../routes/attendanceRoutes.js";

const app = express();

// Global Security, Logging & Parsing Middlewares
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(httpLogger);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/api", globalRateLimiter);

// 1. Standard Health Check per architecture.md: GET /api/v1/health
const healthHandler = (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      database: isConnected ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    },
  });
};

app.get("/api/v1/health", healthHandler);
app.get("/api/health", healthHandler); // Backward-compatibility alias

// 2. Production API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/academic", academicRoutes);
app.use("/api/v1/school", schoolRoutes);
app.use("/api/v1/students", studentRoutes);
app.use("/api/v1/staff", staffRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/fees", feeRoutes);
app.use("/api/v1/exams", examRoutes);
app.use("/api/v1/timetables", timetableRoutes);
app.use("/api/v1/notices", noticeRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/portal", portalRoutes);

// 3. Existing Feature Routes (Preserved so frontend continues working smoothly)
app.use("/api/students", legacyStudentRoutes);
app.use("/api/attendance", legacyAttendanceRoutes);

// 4. Catch-all 404 for undefined routes
app.use((req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
});

// 5. Central Error Handler (Must be registered last)
app.use(errorHandler);

export default app;

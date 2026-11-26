import { ApiError } from "../utils/api-error.js";
import { env } from "../config/env.js";

export function errorHandler(err, req, res, _next) {
  let statusCode = 500;
  let code = "INTERNAL_SERVER_ERROR";
  let message = "An unexpected server error occurred";
  let details = [];

  // 1. ApiError (our custom application error)
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details || [];
  }
  // 2. Zod Validation Error
  else if (err.name === "ZodError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Request validation failed";
    details = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  }
  // 3. Mongoose CastError (e.g. invalid MongoDB ObjectId)
  else if (err.name === "CastError") {
    statusCode = 400;
    code = "INVALID_ID";
    message = `Invalid format for ${err.path}`;
  }
  // 4. Mongoose Duplicate Key Error
  else if (err.code === 11000) {
    statusCode = 409;
    code = "DUPLICATE_KEY";
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `A record with this ${field} already exists`;
  }

  // Log 500s or unexpected errors
  if (statusCode >= 500) {
    console.error(`💥 [${req.method} ${req.url}] Internal Error:`, err);
  }

  // Standard response contract per code-standards.md
  const response = {
    success: false,
    error: {
      code,
      message,
      ...(details.length > 0 && { details }),
      ...(env.NODE_ENV === "development" && statusCode >= 500 && { stack: err.stack }),
    },
  };

  res.status(statusCode).json(response);
}

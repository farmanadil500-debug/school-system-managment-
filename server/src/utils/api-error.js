export class ApiError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code = "BAD_REQUEST", details = []) {
    return new ApiError(400, code, message, details);
  }

  static unauthorized(message = "Authentication required", code = "UNAUTHORIZED") {
    return new ApiError(401, code, message);
  }

  static forbidden(message = "Access forbidden", code = "FORBIDDEN") {
    return new ApiError(403, code, message);
  }

  static notFound(message = "Resource not found", code = "NOT_FOUND") {
    return new ApiError(404, code, message);
  }

  static conflict(message, code = "CONFLICT") {
    return new ApiError(409, code, message);
  }

  static internal(message = "Internal server error", code = "INTERNAL_ERROR") {
    return new ApiError(500, code, message);
  }
}

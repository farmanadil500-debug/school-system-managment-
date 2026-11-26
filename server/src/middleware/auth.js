import { ApiError } from "../utils/api-error.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { hasPermission } from "../constants/index.js";

/**
 * Validates Bearer access token and attaches decoded user to req.user.
 */
export function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Authentication required", "AUTH_REQUIRED"));
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return next(ApiError.unauthorized("Authentication token missing", "AUTH_TOKEN_MISSING"));
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      userId: decoded.sub,
      role: decoded.role,
      schoolId: decoded.schoolId,
      staffId: decoded.staffId || null,
      guardianId: decoded.guardianId || null,
      studentId: decoded.studentId || null,
    };
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(ApiError.unauthorized("Token has expired", "TOKEN_EXPIRED"));
    }
    return next(ApiError.unauthorized("Invalid authentication token", "INVALID_TOKEN"));
  }
}

/**
 * Enforces role-based access control.
 * @param {...string} allowedRoles Roles that are allowed to access the route
 */
export function requireRoles(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required", "AUTH_REQUIRED"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden("You do not have permission to access this resource", "FORBIDDEN")
      );
    }

    next();
  };
}

/**
 * Enforces granular permission-based access control.
 */
export function requirePermission(permission) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required", "AUTH_REQUIRED"));
    }

    if (!hasPermission(req.user.role, permission)) {
      return next(ApiError.forbidden("Insufficient permissions", "FORBIDDEN"));
    }

    next();
  };
}

import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";

/**
 * Sign short-lived access JWT (15 minutes by default).
 * Claims: sub (userId), role, schoolId, staffId, guardianId, studentId
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  });
}

/**
 * Sign rotating refresh token (7 days by default).
 */
export function signRefreshToken(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_TTL,
  });
}

/**
 * Verify access JWT. Throws JsonWebTokenError / TokenExpiredError on invalidity.
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

/**
 * Verify refresh token. Throws JsonWebTokenError / TokenExpiredError on invalidity.
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

/**
 * Hash raw token using SHA-256 to ensure only hashes are stored in the database.
 */
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

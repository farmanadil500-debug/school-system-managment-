import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User } from "../user/user.model.js";
import { RefreshToken } from "./refresh-token.model.js";
import { ApiError } from "../../utils/api-error.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from "../../utils/tokens.js";
import { logAuditEvent } from "../../utils/audit.js";
import { USER_STATUS } from "../../constants/index.js";

export class AuthService {
  /**
   * Log in with email or phone + password.
   */
  static async login({ identifier, password, userAgent, ip }) {
    const trimmedId = identifier.trim().toLowerCase();

    // Query by case-insensitive email or exact phone number
    const user = await User.findOne({
      $or: [{ email: trimmedId }, { phone: identifier.trim() }],
    });

    if (!user) {
      throw ApiError.unauthorized("Invalid email/phone or password", "INVALID_CREDENTIALS");
    }

    // Check account lockout
    if (user.isLocked()) {
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      throw ApiError.forbidden(
        `Account is temporarily locked due to failed attempts. Try again in ${remainingMinutes} minute(s).`,
        "ACCOUNT_LOCKED"
      );
    }

    if (user.status === USER_STATUS.INACTIVE) {
      throw ApiError.forbidden(
        "Account is inactive. Please contact your school administrator.",
        "ACCOUNT_INACTIVE"
      );
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lock
        user.status = USER_STATUS.LOCKED;
      }
      await user.save();

      throw ApiError.unauthorized("Invalid email/phone or password", "INVALID_CREDENTIALS");
    }

    // Reset lockout counters on success
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    if (user.status === USER_STATUS.LOCKED) {
      user.status = USER_STATUS.ACTIVE;
    }
    user.lastLoginAt = new Date();
    await user.save();

    const familyId = crypto.randomUUID();

    // Generate tokens
    const accessToken = signAccessToken({
      sub: user._id.toString(),
      role: user.role,
      schoolId: user.schoolId.toString(),
      staffId: user.staffId ? user.staffId.toString() : null,
      guardianId: user.guardianId ? user.guardianId.toString() : null,
      studentId: user.studentId ? user.studentId.toString() : null,
    });

    const refreshToken = signRefreshToken({
      sub: user._id.toString(),
      familyId,
    });

    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      userAgent,
      ip,
      familyId,
    });

    // Audit log
    await logAuditEvent({
      schoolId: user.schoolId,
      actorId: user._id,
      actorRole: user.role,
      action: "USER_LOGIN",
      entityType: "User",
      entityId: user._id,
      ip,
    });

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Rotate refresh token and issue new access token.
   */
  static async refreshTokens({ refreshToken, userAgent, ip }) {
    if (!refreshToken) {
      throw ApiError.unauthorized("Refresh token is required", "REFRESH_TOKEN_MISSING");
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized(
        "Invalid or expired refresh token. Please sign in again.",
        "INVALID_REFRESH_TOKEN"
      );
    }

    const tokenHash = hashToken(refreshToken);
    const storedToken = await RefreshToken.findOne({ tokenHash });

    // Reuse detection: if a revoked token is presented, revoke the whole family
    if (storedToken && storedToken.revokedAt) {
      if (storedToken.familyId) {
        await RefreshToken.updateMany(
          { userId: storedToken.userId, familyId: storedToken.familyId },
          { revokedAt: new Date() }
        );
      }
      throw ApiError.unauthorized(
        "Token reuse detected. All sessions invalidated. Please sign in again.",
        "TOKEN_REUSE_DETECTED"
      );
    }

    if (!storedToken) {
      throw ApiError.unauthorized("Unrecognized refresh token", "INVALID_REFRESH_TOKEN");
    }

    if (storedToken.expiresAt < new Date()) {
      throw ApiError.unauthorized("Refresh token has expired", "REFRESH_TOKEN_EXPIRED");
    }

    const user = await User.findById(storedToken.userId);
    if (!user || user.status !== USER_STATUS.ACTIVE) {
      throw ApiError.unauthorized(
        "Account is inactive or no longer exists",
        "ACCOUNT_NOT_AVAILABLE"
      );
    }

    // Revoke old token
    storedToken.revokedAt = new Date();
    await storedToken.save();

    // Issue new pair
    const familyId = storedToken.familyId || decoded.familyId || crypto.randomUUID();

    const newAccessToken = signAccessToken({
      sub: user._id.toString(),
      role: user.role,
      schoolId: user.schoolId.toString(),
      staffId: user.staffId ? user.staffId.toString() : null,
      guardianId: user.guardianId ? user.guardianId.toString() : null,
      studentId: user.studentId ? user.studentId.toString() : null,
    });

    const newRefreshToken = signRefreshToken({
      sub: user._id.toString(),
      familyId,
    });

    const newTokenHash = hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: newTokenHash,
      expiresAt: newExpiresAt,
      userAgent,
      ip,
      familyId,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: user.toJSON(),
    };
  }

  /**
   * Revoke refresh token upon logout.
   */
  static async logout({ refreshToken }) {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await RefreshToken.updateOne({ tokenHash }, { revokedAt: new Date() });
    }
    return { success: true };
  }

  /**
   * Change current user's password.
   */
  static async changePassword({ userId, currentPassword, newPassword, ip }) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound("User not found", "USER_NOT_FOUND");
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw ApiError.badRequest("Current password does not match", "PASSWORD_MISMATCH");
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;
    await user.save();

    // Invalidate existing sessions
    await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });

    await logAuditEvent({
      schoolId: user.schoolId,
      actorId: user._id,
      actorRole: user.role,
      action: "USER_PASSWORD_CHANGE",
      entityType: "User",
      entityId: user._id,
      ip,
    });

    return { success: true, message: "Password updated successfully" };
  }

  /**
   * Get authenticated user profile.
   */
  static async getCurrentUser(userId) {
    const user = await User.findById(userId)
      .populate("schoolId", "name code logoUrl settings")
      .lean();

    if (!user) {
      throw ApiError.notFound("User not found", "USER_NOT_FOUND");
    }

    delete user.passwordHash;
    delete user.__v;
    return user;
  }
}

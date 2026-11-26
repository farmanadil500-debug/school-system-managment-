import bcrypt from "bcryptjs";
import { User } from "./user.model.js";
import { RefreshToken } from "../auth/refresh-token.model.js";
import { ApiError } from "../../utils/api-error.js";
import { logAuditEvent } from "../../utils/audit.js";
import { ROLES, USER_STATUS } from "../../constants/index.js";

export class UserService {
  /**
   * List users with pagination and whitelisted filters.
   */
  static async listUsers({ schoolId, page = 1, limit = 20, role, status, q }) {
    const filter = { schoolId };

    if (role) filter.role = role;
    if (status) filter.status = status;

    if (q) {
      const sanitizedQ = q.trim();
      filter.$or = [
        { email: { $regex: sanitizedQ, $options: "i" } },
        { phone: { $regex: sanitizedQ, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-passwordHash -__v")
      .lean();

    return {
      users,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  /**
   * Create a new user with role enforcement and password hashing.
   */
  static async createUser({
    schoolId,
    email,
    phone,
    password,
    role,
    staffId,
    guardianId,
    studentId,
    actorId,
    actorRole,
    ip,
  }) {
    // Role protection: Only super_admin can create admin or super_admin
    if (role === ROLES.SUPER_ADMIN && actorRole !== ROLES.SUPER_ADMIN) {
      throw ApiError.forbidden("Only a super_admin can create another super_admin account");
    }
    if (role === ROLES.ADMIN && actorRole !== ROLES.SUPER_ADMIN) {
      throw ApiError.forbidden("Only a super_admin can create an admin account");
    }

    const normalizedEmail = email ? email.trim().toLowerCase() : undefined;
    const normalizedPhone = phone ? phone.trim() : undefined;

    // Check duplicate email
    if (normalizedEmail) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        throw ApiError.conflict("A user with this email address already exists");
      }
    }

    // Check duplicate phone
    if (normalizedPhone) {
      const existingPhone = await User.findOne({ phone: normalizedPhone });
      if (existingPhone) {
        throw ApiError.conflict("A user with this phone number already exists");
      }
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      schoolId,
      email: normalizedEmail || undefined,
      phone: normalizedPhone || undefined,
      passwordHash,
      role,
      status: USER_STATUS.ACTIVE,
      staffId: staffId || null,
      guardianId: guardianId || null,
      studentId: studentId || null,
      mustChangePassword: true,
    });

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "USER_CREATE",
      entityType: "User",
      entityId: user._id,
      after: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
      ip,
    });

    return user.toJSON();
  }

  /**
   * Get user by ID.
   */
  static async getUserById(id, schoolId) {
    const user = await User.findOne({ _id: id, schoolId }).select("-passwordHash -__v").lean();
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    return user;
  }

  /**
   * Update role or status of a user.
   */
  static async updateUser({ id, schoolId, role, status, actorId, actorRole, ip }) {
    const user = await User.findOne({ _id: id, schoolId });
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    // Cannot modify super_admin unless actor is super_admin
    if (user.role === ROLES.SUPER_ADMIN && actorRole !== ROLES.SUPER_ADMIN) {
      throw ApiError.forbidden("Cannot modify a super_admin user");
    }

    // Cannot promote to super_admin unless actor is super_admin
    if (role === ROLES.SUPER_ADMIN && actorRole !== ROLES.SUPER_ADMIN) {
      throw ApiError.forbidden("Cannot promote a user to super_admin");
    }

    const before = { role: user.role, status: user.status };

    if (role) user.role = role;
    if (status) user.status = status;

    await user.save();

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "USER_UPDATE",
      entityType: "User",
      entityId: user._id,
      before,
      after: { role: user.role, status: user.status },
      ip,
    });

    return user.toJSON();
  }

  /**
   * Reset user password by an administrator.
   */
  static async resetPassword({ id, schoolId, newPassword, actorId, actorRole, ip }) {
    const user = await User.findOne({ _id: id, schoolId });
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    if (user.role === ROLES.SUPER_ADMIN && actorRole !== ROLES.SUPER_ADMIN) {
      throw ApiError.forbidden("Cannot reset password of a super_admin user");
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = true;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // Revoke all sessions for this user
    await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "USER_PASSWORD_ADMIN_RESET",
      entityType: "User",
      entityId: user._id,
      ip,
    });

    return { message: "Password reset successfully. The user must set a new password upon login." };
  }
}

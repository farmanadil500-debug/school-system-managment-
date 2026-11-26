import mongoose from "mongoose";
import { AuditLog } from "../modules/audit/audit-log.model.js";

/**
 * Creates an append-only audit log entry.
 * Secrets (passwords, tokens) MUST be stripped prior to calling this helper.
 */
export async function logAuditEvent({
  schoolId,
  actorId,
  actorRole,
  action,
  entityType,
  entityId,
  before = null,
  after = null,
  ip = "",
}) {
  try {
    // If database connection is not active (e.g. lightweight unit test mode), skip write
    if (mongoose.connection.readyState !== 1) {
      return null;
    }

    // Sanitize before and after just in case
    const sanitize = (data) => {
      if (!data || typeof data !== "object") return data;
      const copy = { ...data };
      delete copy.password;
      delete copy.passwordHash;
      delete copy.token;
      delete copy.tokenHash;
      return copy;
    };

    return await AuditLog.create({
      schoolId,
      actorId,
      actorRole,
      action,
      entityType,
      entityId,
      before: sanitize(before),
      after: sanitize(after),
      ip,
      at: new Date(),
    });
  } catch (error) {
    // In production, an audit log failure should be logged loudly
    console.error("❌ Failed to write audit log:", error.message);
  }
}

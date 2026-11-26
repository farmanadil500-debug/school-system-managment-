import mongoose from "mongoose";
import { ROLE_LIST, ROLES, USER_STATUS, USER_STATUS_LIST } from "../../constants/index.js";

const userSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "schoolId is required"],
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, "passwordHash is required"],
    },
    role: {
      type: String,
      enum: ROLE_LIST,
      default: ROLES.STUDENT,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: USER_STATUS_LIST,
      default: USER_STATUS.ACTIVE,
      required: true,
      index: true,
    },
    // Associated profile pointers
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
    guardianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guardian",
      default: null,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    mustChangePassword: {
      type: Boolean,
      default: true,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for role-based queries per school
userSchema.index({ schoolId: 1, role: 1 });

// Helper to check if account is locked
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

export const User = mongoose.models.User || mongoose.model("User", userSchema);

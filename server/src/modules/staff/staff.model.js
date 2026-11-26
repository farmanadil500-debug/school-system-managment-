import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    employeeNo: {
      type: String,
      required: [true, "Employee number is required"],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Staff name is required"],
      trim: true,
    },
    staffType: {
      type: String,
      enum: ["teacher", "accountant", "admin", "support"],
      required: [true, "Staff type is required"],
      default: "teacher",
      index: true,
    },
    phone: {
      type: String,
      required: [true, "Contact phone is required"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    qualification: {
      type: String,
      trim: true,
      default: "",
    },
    experience: {
      type: String,
      trim: true,
      default: "",
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "on_leave", "terminated"],
      default: "active",
      index: true,
    },
    salary: {
      type: Number,
      default: 0,
      min: 0,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

staffSchema.index({ schoolId: 1, employeeNo: 1 }, { unique: true });
staffSchema.index({ schoolId: 1, staffType: 1, status: 1 });

export const Staff = mongoose.models.Staff || mongoose.model("Staff", staffSchema);

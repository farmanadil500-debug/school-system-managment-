import mongoose from "mongoose";
import { ATTENDANCE_STATUS_LIST, ATTENDANCE_STATUS } from "../../constants/index.js";

const attendanceSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD in school timezone
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ATTENDANCE_STATUS_LIST,
      default: ATTENDANCE_STATUS.PRESENT,
      required: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// One attendance record per student per calendar date
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

// Efficient lookups by section and date
attendanceSchema.index({ sectionId: 1, date: 1 });

// Daily school-wide attendance lookups
attendanceSchema.index({ schoolId: 1, date: 1 });

// Academic year historical lookups
attendanceSchema.index({ academicYearId: 1, sectionId: 1, date: 1 });

export const Attendance =
  mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);

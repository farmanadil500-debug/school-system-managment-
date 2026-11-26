import mongoose from "mongoose";
import { DAYS_OF_WEEK } from "../../constants/index.js";

const timetableSlotSchema = new mongoose.Schema(
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
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
      index: true,
    },
    day: {
      type: String,
      enum: DAYS_OF_WEEK,
      lowercase: true,
      required: [true, "Day of week is required"],
    },
    period: {
      type: Number,
      required: [true, "Period number is required"],
      min: [1, "Period must be at least 1"],
      max: [12, "Period cannot exceed 12"],
    },
    startTime: {
      type: String,
      required: [true, "Start time is required"],
      trim: true,
    },
    endTime: {
      type: String,
      required: [true, "End time is required"],
      trim: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject is required"],
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: [true, "Teacher/Staff is required"],
    },
    room: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound indexes per architecture.md:
// 1. One subject/lesson per section per day and period
timetableSlotSchema.index({ sectionId: 1, day: 1, period: 1 }, { unique: true });

// 2. Clash detection: A teacher cannot teach two sections at the same day and period
timetableSlotSchema.index({ staffId: 1, day: 1, period: 1 }, { unique: true });

// 3. Compound query indexes
timetableSlotSchema.index({ schoolId: 1, academicYearId: 1, sectionId: 1 });
timetableSlotSchema.index({ schoolId: 1, staffId: 1 });

timetableSlotSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const TimetableSlot =
  mongoose.models.TimetableSlot || mongoose.model("TimetableSlot", timetableSlotSchema);

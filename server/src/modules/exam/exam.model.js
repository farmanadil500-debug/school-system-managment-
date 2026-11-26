import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: [true, "Exam name is required"],
      trim: true,
    },
    termName: {
      type: String,
      required: [true, "Term name is required"],
      trim: true,
      default: "Term 1",
    },
    classIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
      },
    ],
    startDate: {
      type: String, // Format: YYYY-MM-DD
      default: "",
    },
    endDate: {
      type: String, // Format: YYYY-MM-DD
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "marking", "locked", "published"],
      default: "draft",
      index: true,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

examSchema.index({ schoolId: 1, academicYearId: 1 });

export const Exam = mongoose.models.Exam || mongoose.model("Exam", examSchema);

import mongoose from "mongoose";

const teachingAssignmentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "schoolId is required"],
      index: true,
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: [true, "academicYearId is required"],
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: [true, "sectionId is required"],
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "subjectId is required"],
      index: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "staffId is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

teachingAssignmentSchema.index({ academicYearId: 1, sectionId: 1, subjectId: 1 }, { unique: true });

export const TeachingAssignment =
  mongoose.models.TeachingAssignment ||
  mongoose.model("TeachingAssignment", teachingAssignmentSchema);

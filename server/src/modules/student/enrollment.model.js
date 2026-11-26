import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
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
    rollNo: {
      type: Number,
      default: null,
    },
    outcome: {
      type: String,
      enum: ["active", "promoted", "repeated", "left"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Exactly one enrollment per student per academic year
enrollmentSchema.index({ studentId: 1, academicYearId: 1 }, { unique: true });
// Roll number uniqueness within a section and academic year when assigned
enrollmentSchema.index({ sectionId: 1, academicYearId: 1, rollNo: 1 }, { sparse: true });

export const Enrollment =
  mongoose.models.Enrollment || mongoose.model("Enrollment", enrollmentSchema);

import mongoose from "mongoose";

const termSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Term name is required"],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "Term start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "Term end date is required"],
    },
  },
  { _id: true }
);

const academicYearSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "schoolId is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Academic year name is required"],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "Academic year start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "Academic year end date is required"],
    },
    isCurrent: {
      type: Boolean,
      default: false,
      index: true,
    },
    terms: {
      type: [termSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Unique index: each school has distinct academic year names
academicYearSchema.index({ schoolId: 1, name: 1 }, { unique: true });

export const AcademicYear =
  mongoose.models.AcademicYear || mongoose.model("AcademicYear", academicYearSchema);

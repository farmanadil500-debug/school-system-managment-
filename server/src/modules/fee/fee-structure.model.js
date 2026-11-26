import mongoose from "mongoose";

const feeItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Fee item name is required"],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Fee item amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    frequency: {
      type: String,
      enum: ["monthly", "one_time", "annual"],
      default: "monthly",
    },
  },
  { _id: false }
);

const feeStructureSchema = new mongoose.Schema(
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
    items: {
      type: [feeItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// One fee structure per class per academic session
feeStructureSchema.index({ schoolId: 1, academicYearId: 1, classId: 1 }, { unique: true });

export const FeeStructure =
  mongoose.models.FeeStructure || mongoose.model("FeeStructure", feeStructureSchema);

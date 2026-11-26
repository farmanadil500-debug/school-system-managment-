import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "schoolId is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Subject code is required"],
      trim: true,
      uppercase: true,
    },
  },
  {
    timestamps: true,
  }
);

subjectSchema.index({ schoolId: 1, code: 1 }, { unique: true });

export const Subject = mongoose.models.Subject || mongoose.model("Subject", subjectSchema);

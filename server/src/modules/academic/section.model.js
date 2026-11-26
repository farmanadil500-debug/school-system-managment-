import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "schoolId is required"],
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "classId is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Section name is required"],
      trim: true,
      uppercase: true,
    },
    classTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
    capacity: {
      type: Number,
      default: 40,
      min: 1,
      max: 200,
    },
  },
  {
    timestamps: true,
  }
);

sectionSchema.index({ classId: 1, name: 1 }, { unique: true });

export const Section = mongoose.models.Section || mongoose.model("Section", sectionSchema);

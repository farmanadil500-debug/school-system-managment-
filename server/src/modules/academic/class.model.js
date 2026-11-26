import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "schoolId is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Class name is required"],
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

classSchema.index({ schoolId: 1, name: 1 }, { unique: true });

export const Class = mongoose.models.Class || mongoose.model("Class", classSchema);

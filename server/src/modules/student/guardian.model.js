import mongoose from "mongoose";

const guardianSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Guardian name is required"],
      trim: true,
    },
    relation: {
      type: String,
      enum: ["father", "mother", "guardian", "other"],
      default: "father",
    },
    phone: {
      type: String,
      required: [true, "Guardian phone number is required"],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    occupation: {
      type: String,
      trim: true,
      default: "",
    },
    cnic: {
      type: String,
      trim: true,
      default: "", // Sensitive: masked in public lists
    },
  },
  {
    timestamps: true,
  }
);

guardianSchema.index({ schoolId: 1, phone: 1 });

export const Guardian = mongoose.models.Guardian || mongoose.model("Guardian", guardianSchema);

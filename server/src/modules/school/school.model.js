import mongoose from "mongoose";

const schoolSettingsSchema = new mongoose.Schema(
  {
    currency: { type: String, default: "PKR" },
    timezone: { type: String, default: "Asia/Karachi" },
    gradingScheme: { type: String, default: "standard" },
    feeDueDay: { type: Number, default: 10, min: 1, max: 31 },
    lateFine: { type: Number, default: 500, min: 0 },
    attendanceEditDays: { type: Number, default: 2, min: 0, max: 30 },
  },
  { _id: false }
);

const schoolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "School name is required"],
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: "APEX",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    logoUrl: {
      type: String,
      trim: true,
      default: "",
    },
    settings: {
      type: schoolSettingsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

export const School = mongoose.models.School || mongoose.model("School", schoolSchema);

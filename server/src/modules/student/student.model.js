import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    admissionNo: {
      type: String,
      required: [true, "Admission number is required"],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Student full name is required"],
      trim: true,
    },
    dob: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: [true, "Gender is required"],
      lowercase: true,
    },
    guardianIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Guardian",
      },
    ],
    address: {
      type: String,
      trim: true,
      default: "",
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "graduated", "expelled", "withdrawn"],
      default: "active",
      index: true,
    },
    photoUrl: {
      type: String,
      trim: true,
      default: "",
    },
    bloodGroup: {
      type: String,
      trim: true,
      default: "",
    },
    emergencyPhone: {
      type: String,
      trim: true,
      default: "",
    },
    currentEnrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

studentSchema.index({ schoolId: 1, admissionNo: 1 }, { unique: true });
studentSchema.index({ name: "text" });
studentSchema.index({ schoolId: 1, status: 1 });

export const Student = mongoose.models.Student || mongoose.model("Student", studentSchema);

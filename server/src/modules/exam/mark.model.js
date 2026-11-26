import mongoose from "mongoose";

const markSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
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
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    marksObtained: {
      type: Number,
      default: 0,
      min: 0,
    },
    isAbsent: {
      type: Boolean,
      default: false,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique mark entry per exam, subject, and student
markSchema.index({ examId: 1, subjectId: 1, studentId: 1 }, { unique: true });

// Fast lookups by class, section, and subject
markSchema.index({ examId: 1, sectionId: 1, subjectId: 1 });

export const Mark = mongoose.models.Mark || mongoose.model("Mark", markSchema);

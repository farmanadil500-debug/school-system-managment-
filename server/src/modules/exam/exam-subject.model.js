import mongoose from "mongoose";

const examSubjectSchema = new mongoose.Schema(
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
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      default: "",
    },
    totalMarks: {
      type: Number,
      required: true,
      default: 100,
      min: [1, "Total marks must be at least 1"],
    },
    passingMarks: {
      type: Number,
      required: true,
      default: 33,
      min: [0, "Passing marks cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

// One subject entry per exam per class
examSubjectSchema.index({ examId: 1, classId: 1, subjectId: 1 }, { unique: true });

export const ExamSubject =
  mongoose.models.ExamSubject || mongoose.model("ExamSubject", examSubjectSchema);

import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
  },
  studentName: {
    type: String,
    required: true,
  },
  rollNo: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["Present", "Absent", "Late"],
    default: "Present",
  },
});

const attendanceSchema = new mongoose.Schema(
  {
    date: {
      type: String, // Format: YYYY-MM-DD
      required: [true, "Date is required"],
      index: true,
    },
    class: {
      type: String,
      required: [true, "Class is required"],
    },
    section: {
      type: String,
      required: [true, "Section is required"],
    },
    records: [attendanceRecordSchema],
    totalPresent: {
      type: Number,
      default: 0,
    },
    totalAbsent: {
      type: Number,
      default: 0,
    },
    totalLate: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one attendance sheet per date + class + section
attendanceSchema.index({ date: 1, class: 1, section: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;

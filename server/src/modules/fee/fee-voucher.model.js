import mongoose from "mongoose";

const voucherItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const feeVoucherSchema = new mongoose.Schema(
  {
    voucherNo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
      required: true,
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
      index: true,
    },
    period: {
      type: String, // Format: YYYY-MM
      required: true,
      index: true,
    },
    items: {
      type: [voucherItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    fine: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    balance: {
      type: Number,
      required: true,
      min: 0,
    },
    dueDate: {
      type: String, // Format: YYYY-MM-DD
      required: true,
    },
    status: {
      type: String,
      enum: ["unpaid", "partial", "paid", "cancelled"],
      default: "unpaid",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Idempotent: One fee voucher per student per billing month
feeVoucherSchema.index({ studentId: 1, period: 1 }, { unique: true });

// Efficient lookups by school, period, and status
feeVoucherSchema.index({ schoolId: 1, period: 1 });
feeVoucherSchema.index({ schoolId: 1, status: 1 });

export const FeeVoucher =
  mongoose.models.FeeVoucher || mongoose.model("FeeVoucher", feeVoucherSchema);

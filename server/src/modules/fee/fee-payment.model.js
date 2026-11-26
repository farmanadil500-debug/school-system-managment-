import mongoose from "mongoose";

const feePaymentSchema = new mongoose.Schema(
  {
    receiptNo: {
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
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeVoucher",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: ["cash", "bank_transfer", "cheque", "online"],
      default: "cash",
      required: true,
    },
    reference: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["posted", "reversed"],
      default: "posted",
      index: true,
    },
    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeePayment",
      default: null,
    },
    reversalReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Append-only invariant: Never update or delete payment records directly
feePaymentSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate", "findOneAndReplace", "replaceOne"],
  function () {
    throw new Error(
      "FeePayment collection is append-only. Use reversal entries to adjust payments."
    );
  }
);

feePaymentSchema.pre(["deleteOne", "deleteMany", "findOneAndDelete"], function () {
  throw new Error("FeePayment collection is append-only. Payment records cannot be deleted.");
});

export const FeePayment =
  mongoose.models.FeePayment || mongoose.model("FeePayment", feePaymentSchema);

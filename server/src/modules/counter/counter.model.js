import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      index: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

counterSchema.index({ schoolId: 1, key: 1 }, { unique: true });

export const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);

/**
 * Atomically increments and retrieves next sequence number for a given counter key.
 */
export async function getNextSequence(schoolId, key) {
  const result = await Counter.findOneAndUpdate(
    { schoolId, key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return result.seq;
}

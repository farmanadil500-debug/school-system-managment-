import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },
    rollNo: {
      type: Number,
      required: [true, "Roll number is required"],
      unique: true,
    },
    class: {
      type: String,
      required: [true, "Class is required"],
      trim: true,
    },
    section: {
      type: String,
      required: [true, "Section is required"],
      default: "A",
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Male",
    },
    parentName: {
      type: String,
      required: [true, "Parent name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Contact phone is required"],
      trim: true,
    },
    admissionDate: {
      type: String,
      default: () => new Date().toISOString().slice(0, 10),
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    feeStatus: {
      type: String,
      enum: ["Paid", "Pending", "Overdue"],
      default: "Pending",
    },
    feeAmount: {
      type: Number,
      default: 5000,
    },
    email: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    dob: {
      type: String,
    },
    bloodGroup: {
      type: String,
      default: "A+",
    },
  },
  {
    timestamps: true, // Automatically creates `createdAt` and `updatedAt`
  }
);

// Virtual for id to match frontend expectation of `id` instead of just `_id`
studentSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

studentSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    return ret;
  },
});

const Student = mongoose.model("Student", studentSchema);

export default Student;


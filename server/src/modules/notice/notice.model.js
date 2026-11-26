import mongoose from "mongoose";
import { ROLE_LIST } from "../../constants/index.js";

const noticeSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    body: {
      type: String,
      required: [true, "Notice content is required"],
      trim: true,
    },
    audience: {
      roles: [
        {
          type: String,
          enum: ROLE_LIST,
        },
      ],
      classIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Class",
        },
      ],
      sectionIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Section",
        },
      ],
    },
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    attachmentUrl: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

noticeSchema.index({ schoolId: 1, isPinned: -1, publishedAt: -1 });
noticeSchema.index({ schoolId: 1, "audience.roles": 1 });
noticeSchema.index({ schoolId: 1, "audience.classIds": 1 });
noticeSchema.index({ schoolId: 1, status: 1 });

noticeSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Notice = mongoose.models.Notice || mongoose.model("Notice", noticeSchema);

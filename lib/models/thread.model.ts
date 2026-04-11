import mongoose from "mongoose";

const threadMediaSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
      min: 1,
    },
    width: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    durationSec: {
      type: Number,
      default: null,
    },
    providerKey: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const threadSchema = new mongoose.Schema({
  text: {
    type: String,
    default: "",
    trim: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Community",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  parentId: {
    type: String,
  },
  children: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
    },
  ],
  likes: {
    type: [String],
    default: [],
  },
  reposts: {
    type: [String],
    default: [],
  },
  media: {
    type: [threadMediaSchema],
    default: [],
  },
});

threadSchema.index({ author: 1, createdAt: -1 });
threadSchema.index({ community: 1, createdAt: -1 });
threadSchema.index({ parentId: 1, createdAt: -1 });
threadSchema.index(
  { author: 1, createdAt: -1 },
  { partialFilterExpression: { "media.0": { $exists: true } } }
);
threadSchema.index(
  { community: 1, createdAt: -1 },
  { partialFilterExpression: { "media.0": { $exists: true } } }
);

const Thread = mongoose.models.Thread || mongoose.model("Thread", threadSchema);

export default Thread;

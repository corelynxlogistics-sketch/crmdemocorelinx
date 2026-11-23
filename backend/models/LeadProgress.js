import mongoose from "mongoose";

const leadProgressSchema = new mongoose.Schema(
  {
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    leadSheet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadSheet",
      required: true
    },
    currentIndex: {
      type: Number,
      default: 0
    },
    completedLeads: [
      {
        leadIndex: Number,
        remark: String,
        note: String,
        submittedAt: Date
      }
    ],
phoneCopyTimestamps: [
  {
    leadIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    copiedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
],
    pinnedLeads: [
  {
    leadIndex: Number,
    reason: String,
    note: String,
    pinnedAt: Date,
  },
],
  },
  { timestamps: true }
);

leadProgressSchema.index({ agent: 1, leadSheet: 1 }, { unique: true });

export default mongoose.model("LeadProgress", leadProgressSchema);
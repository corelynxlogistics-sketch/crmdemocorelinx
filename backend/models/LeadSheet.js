import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    rawData: {
      type: Object,
      required: true,
    },
  },
  { _id: true }
);

const leadSheetSchema = new mongoose.Schema(
  {
    sheetName: {
      type: String,
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    headers: [String],
    totalLeads: {
      type: Number,
      default: 0,
    },
    leads: [leadSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("LeadSheet", leadSheetSchema);
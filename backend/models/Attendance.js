import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    date: {
      type: String,
      required: true
    },
    loginTime: Date,
    logoutTime: Date,
    status: {
      type: String,
      enum: ["Present", "Late", "Absent"],
      default: "Present"
    }
  },
  { timestamps: true }
);

attendanceSchema.index({ agent: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
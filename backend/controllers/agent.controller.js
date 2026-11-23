import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import LeadSheet from "../models/LeadSheet.js";
import LeadProgress from "../models/LeadProgress.js";
export const createAgent = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const agent = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "agent"
    });

    res.status(201).json({
      message: "Agent created successfully",
      agent
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAgents = async (req, res) => {
  try {
    const agents = await User.find({ role: "agent" }).select("-password");
    res.json(agents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find()
      .populate("agent", "name email")
      .sort({ createdAt: -1 });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const updateAgent = async (req, res) => {
  try {
    const { name, email, isActive } = req.body;

    const agent = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, isActive },
      { new: true }
    ).select("-password");

    res.json({ message: "Agent updated", agent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAgent = async (req, res) => {
  try {
    const agentId = req.params.id;

    const agent = await User.findById(agentId);

    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    if (agent.role !== "agent") {
      return res.status(400).json({
        message: "Only agent users can be deleted from this API",
      });
    }

    await LeadProgress.deleteMany({ agent: agentId });

    await Attendance.deleteMany({ agent: agentId });

    await LeadSheet.deleteMany({ assignedTo: agentId });

    await User.findByIdAndDelete(agentId);

    res.json({
      message:
        "Agent deleted successfully with all related sheets, progress, and attendance data",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAgentSheets = async (req, res) => {
  try {
    const sheets = await LeadSheet.find({ assignedTo: req.params.id }).sort({
      createdAt: -1,
    });

    res.json(sheets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (user.role === "agent") {
      const today = new Date().toISOString().split("T")[0];

      await Attendance.findOneAndUpdate(
        { agent: user._id, date: today },
        {
          agent: user._id,
          date: today,
          loginTime: new Date(),
          status: "Present"
        },
        { upsert: true, new: true }
      );
    }

    res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAdmin = async (req, res) => {
  try {
    const existing = await User.findOne({ role: "admin" });

    if (existing) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = await User.create({
      name: "Admin",
      email: "admin@corelynxlogistics.com",
      password: hashedPassword,
      role: "admin"
    });

    res.json({
      message: "Admin created",
      email: admin.email,
      password: "admin123"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
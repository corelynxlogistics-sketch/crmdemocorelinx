import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import {
  createAgent,
  getAgents,
  getAttendance,
  updateAgent,
  deleteAgent,
  getAgentSheets,
} from "../controllers/agent.controller.js";

const router = express.Router();

router.post("/", protect, adminOnly, createAgent);
router.get("/", protect, adminOnly, getAgents);
router.get("/attendance", protect, adminOnly, getAttendance);
router.put("/:id", protect, adminOnly, updateAgent);
router.delete("/:id", protect, adminOnly, deleteAgent);
router.get("/:id/sheets", protect, adminOnly, getAgentSheets);
export default router;
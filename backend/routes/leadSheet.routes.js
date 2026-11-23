import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import {
  createLeadSheet,
  downloadCompletedLeadsCSV,
  uploadLeadSheetCSV,
  getAssignedSheets,
  getCurrentLead,
  submitRemarkAndNext,
  deleteLeadSheet,
  getAdminTracking,
  getLeadSheetById,
  pinCurrentLead,
getPinnedLeads,
removePinnedLead,
getLeadByIndex,
getAgentLeadReport,
recordPhoneCopy
} from "../controllers/leadSheet.controller.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.post("/", protect, adminOnly, createLeadSheet);
router.get("/assigned", protect, getAssignedSheets);
router.get("/agent/report/summary", protect, getAgentLeadReport);
router.get("/:sheetId/current", protect, getCurrentLead);
router.get(
  "/:sheetId/download-completed",
  protect,
  downloadCompletedLeadsCSV
);
router.post("/:sheetId/pin", protect, pinCurrentLead);

router.get("/:sheetId/pinned", protect, getPinnedLeads);

router.delete("/:sheetId/pinned/:leadIndex", protect, removePinnedLead);

router.get("/:sheetId/lead/:leadIndex", protect, getLeadByIndex);
router.post("/:sheetId/next", protect, submitRemarkAndNext);
router.post("/:sheetId/phone-copied", protect, recordPhoneCopy);
router.get("/admin/tracking/all", protect, adminOnly, getAdminTracking);
router.get("/:sheetId/view", protect, adminOnly, getLeadSheetById);
router.post(
  "/upload-csv",
  protect,
  adminOnly,
  upload.single("file"),
  uploadLeadSheetCSV
);
router.delete("/:sheetId", protect, adminOnly, deleteLeadSheet);
export default router;
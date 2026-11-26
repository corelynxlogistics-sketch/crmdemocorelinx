import LeadSheet from "../models/LeadSheet.js";
import LeadProgress from "../models/LeadProgress.js";
import csvParser from "csv-parser";
import { Readable } from "stream";
export const uploadLeadSheetCSV = async (req, res) => {
  try {
    const { sheetName, assignedTo } = req.body;

    if (!sheetName || !assignedTo) {
      return res.status(400).json({
        message: "Sheet name and assigned agent are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "CSV file is required",
      });
    }

    const leads = [];
    let headers = [];

    const csvText = req.file.buffer.toString("utf8");
    const stream = Readable.from(csvText);

    stream
      .pipe(
        csvParser({
          mapHeaders: ({ header }) => header.trim(),
          mapValues: ({ value }) => value?.trim(),
        })
      )
      .on("headers", (csvHeaders) => {
        headers = csvHeaders;
      })
      .on("data", (row) => {
        leads.push({
          rawData: row,
        });
      })
      .on("end", async () => {
        if (!leads.length) {
          return res.status(400).json({
            message: "CSV has no lead rows",
          });
        }

        const sheet = await LeadSheet.create({
          sheetName,
          assignedTo,
          headers,
          totalLeads: leads.length,
          leads,
        });

        res.status(201).json({
          message: "CSV uploaded and assigned successfully",
          totalLeads: leads.length,
          headers,
          sheet,
        });
      })
      .on("error", (error) => {
        res.status(500).json({
          message: error.message,
        });
      });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
export const createLeadSheet = async (req, res) => {
  try {
    const { sheetName, assignedTo, leads } = req.body;

    const sheet = await LeadSheet.create({
      sheetName,
      assignedTo,
      leads
    });

    res.status(201).json({
      message: "Lead sheet created",
      sheet
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAssignedSheets = async (req, res) => {
  try {
    const sheets = await LeadSheet.find({ assignedTo: req.user._id });
    res.json(sheets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCurrentLead = async (req, res) => {
  try {
    const { sheetId } = req.params;

    const sheet = await LeadSheet.findById(sheetId);

    if (!sheet) {
      return res.status(404).json({ message: "Sheet not found" });
    }

    let progress = await LeadProgress.findOne({
      agent: req.user._id,
      leadSheet: sheetId
    });

    if (!progress) {
      progress = await LeadProgress.create({
        agent: req.user._id,
        leadSheet: sheetId,
        currentIndex: 0
      });
    }

    const currentLead = sheet.leads[progress.currentIndex];

    if (!currentLead) {
      return res.json({
        completed: true,
        message: "All leads completed"
      });
    }

    res.json({
      completed: false,
      currentIndex: progress.currentIndex,
      totalLeads: sheet.leads.length,
      lead: currentLead
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================================
   CORELYNX — TRACK PHONE COPY TIMESTAMP
   Records first successful copy per lead
========================================== */


/* ==========================================
   CORELYNX — RECORD PHONE COPY TIMESTAMP
   Supports multiple CSV phone column names
   Preserves first successful copy timestamp
========================================== */

export const recordPhoneCopy = async (req, res) => {
  try {
    const { sheetId } = req.params;
    const { leadIndex } = req.body;

    // 1. Validate the lead index
    if (!Number.isInteger(leadIndex) || leadIndex < 0) {
      return res.status(400).json({
        message: "A valid lead index is required",
      });
    }

    // 2. Find the lead sheet
    const sheet = await LeadSheet.findById(sheetId);

    if (!sheet) {
      return res.status(404).json({
        message: "Lead sheet not found",
      });
    }

    // 3. Verify the assigned agent
    if (String(sheet.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({
        message: "You are not assigned to this lead sheet",
      });
    }

    // 4. Validate the requested lead
    if (leadIndex >= sheet.leads.length) {
      return res.status(404).json({
        message: "Lead not found",
      });
    }

    // 5. Find the agent's progress
    const progress = await LeadProgress.findOne({
      agent: req.user._id,
      leadSheet: sheetId,
    });

    if (!progress) {
      return res.status(404).json({
        message: "Agent progress not found",
      });
    }

    // 6. Allow current lead or pinned follow-up
    const isCurrentLead = progress.currentIndex === leadIndex;

    const isPinnedLead = (progress.pinnedLeads || []).some(
      (item) => item.leadIndex === leadIndex
    );

    if (!isCurrentLead && !isPinnedLead) {
      return res.status(403).json({
        message: "This lead is not available for tracking",
      });
    }

    // 7. Get original CSV row data
    const lead = sheet.leads[leadIndex];
    const rawData = lead?.rawData || {};

    // 8. Recognize different phone column headings
    const supportedPhoneHeaders = [
      "phone",
      "phonenumber",
      "phoneno",
      "phone1",
      "phone2",
      "contact",
      "contactnumber",
      "contactno",
      "contactphone",
      "carrierphone",
      "carrierphonenumber",
      "mobile",
      "mobilenumber",
      "mobileno",
      "cell",
      "cellphone",
      "telephone",
      "tel",
    ];

    const normalizeHeader = (key) =>
      String(key).toLowerCase().replace(/[^a-z0-9]/g, "");

    let phone = null;

    // 9. Find the first valid phone field
    for (const header of supportedPhoneHeaders) {
      const match = Object.entries(rawData).find(([key, value]) => {
        const normalizedKey = normalizeHeader(key);
        const digits = String(value ?? "").replace(/\D/g, "");

        return (
          normalizedKey === header &&
          digits.length >= 7 &&
          digits.length <= 15
        );
      });

      if (match) {
        phone = String(match[1]).trim();
        break;
      }
    }

    // 10. Reject only if no valid phone number exists
    if (!phone) {
      return res.status(400).json({
        message: "This lead has no valid phone number",
      });
    }

    // 11. Save first phone-copy timestamp atomically.
    // Repeated copies do not overwrite the original.
    await LeadProgress.updateOne(
      {
        _id: progress._id,
        "phoneCopyTimestamps.leadIndex": {
          $ne: leadIndex,
        },
      },
      {
        $push: {
          phoneCopyTimestamps: {
            leadIndex,
            copiedAt: new Date(),
          },
        },
      }
    );

    // 12. Retrieve the saved timestamp
    const updatedProgress = await LeadProgress.findById(
      progress._id
    ).select("phoneCopyTimestamps");

    const record = updatedProgress?.phoneCopyTimestamps?.find(
      (item) => item.leadIndex === leadIndex
    );
// Confirm the timestamp was actually saved
if (!record?.copiedAt) {
  return res.status(500).json({
    success: false,
    message: "Phone copy timestamp could not be verified",
  });
}

return res.status(200).json({
  success: true,
  message: "Phone copy timestamp recorded",
  leadIndex,
  copiedAt: record.copiedAt,
});
  } catch (error) {
    console.error("Phone copy tracking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to record phone copy timestamp",
    });
  }
};



/* ==========================================
   CORELYNX — SAVE REMARK + TIMESTAMP
   Supports current leads and pinned leads
========================================== */

export const submitRemarkAndNext = async (req, res) => {
  try {
    const { sheetId } = req.params;
    const { remark, note, leadIndex } = req.body;

    if (typeof remark !== "string" || !remark.trim()) {
      return res.status(400).json({
        message: "Remark is required",
      });
    }

    const sheet = await LeadSheet.findById(sheetId);

    if (!sheet) {
      return res.status(404).json({
        message: "Sheet not found",
      });
    }

    if (String(sheet.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({
        message: "You are not assigned to this lead sheet",
      });
    }

    const progress = await LeadProgress.findOne({
      agent: req.user._id,
      leadSheet: sheetId,
    });

    if (!progress) {
      return res.status(404).json({
        message: "Progress not found",
      });
    }

    // Compatible with existing requests that omit leadIndex.
    const index =
      leadIndex === undefined
        ? progress.currentIndex
        : leadIndex;

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= sheet.leads.length
    ) {
      return res.status(400).json({
        message: "Invalid lead index",
      });
    }

    const isCurrentLead = index === progress.currentIndex;

    const isPinnedLead = progress.pinnedLeads.some(
      (item) => item.leadIndex === index
    );

    if (!isCurrentLead && !isPinnedLead) {
      return res.status(403).json({
        message: "You cannot submit a remark for this lead",
      });
    }

    const submittedAt = new Date();

    if (isCurrentLead) {
      // Save and advance atomically to avoid double submits.
      const updated = await LeadProgress.findOneAndUpdate(
        {
          _id: progress._id,
          currentIndex: index,
          "completedLeads.leadIndex": { $ne: index },
        },
        {
          $push: {
            completedLeads: {
              leadIndex: index,
              remark: remark.trim(),
              note: note || "",
              submittedAt,
            },
          },
          $inc: {
            currentIndex: 1,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updated) {
        return res.status(409).json({
          message:
            "This lead has already been submitted. Refresh the current lead.",
        });
      }

      return res.json({
        message: "Remark saved and moved to next lead",
        leadIndex: index,
        currentIndex: updated.currentIndex,
        submittedAt,
      });
    }

    // Previously completed pinned leads can be updated
    // without advancing the main calling queue.
    const completedLead = progress.completedLeads.find(
      (item) => item.leadIndex === index
    );

    if (!completedLead) {
      return res.status(409).json({
        message: "Pinned lead has not been completed yet",
      });
    }

    completedLead.remark = remark.trim();
    completedLead.note = note || "";
    completedLead.submittedAt = submittedAt;

    await progress.save();

    return res.json({
      message: "Pinned lead remark updated",
      leadIndex: index,
      currentIndex: progress.currentIndex,
      submittedAt,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};


export const getAdminTracking = async (req, res) => {
  try {
    const tracking = await LeadProgress.find()
      .populate("agent", "name email")
      .populate("leadSheet", "sheetName leads totalLeads")
      .sort({ updatedAt: -1 })
      .lean();

    // Remove tracking records whose agent or lead sheet was deleted
    const validTracking = tracking.filter(
      (item) => item.agent && item.leadSheet
    );

    res.json(validTracking);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
export const deleteLeadSheet = async (req, res) => {
  try {
    const { sheetId } = req.params;

    const sheet = await LeadSheet.findById(sheetId);

    if (!sheet) {
      return res.status(404).json({
        message: "Lead sheet not found",
      });
    }

    // Delete all tracking/progress connected to this sheet
    await LeadProgress.deleteMany({
      leadSheet: sheetId,
    });

    // Delete the actual lead sheet
    await LeadSheet.findByIdAndDelete(sheetId);

    res.json({
      message: "Lead sheet and its tracking data deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};



/* ==========================================
   CORELYNX — ADMIN LEAD SHEET PREVIEW
   Adds copy time and remark save time
========================================== */

export const getLeadSheetById = async (req, res) => {
  try {
    const sheet = await LeadSheet.findById(req.params.sheetId)
      .populate("assignedTo", "name email")
      .lean();

    if (!sheet) {
      return res.status(404).json({
        message: "Lead sheet not found",
      });
    }

    const progress = await LeadProgress.findOne({
      leadSheet: req.params.sheetId,
      agent: sheet.assignedTo?._id,
    }).lean();

    const completedMap = {};
    const phoneCopyMap = {};

    // Match saved remarks to the original CSV row.
    progress?.completedLeads?.forEach((item) => {
      completedMap[item.leadIndex] = item;
    });

    // Match phone-copy timestamps to the same row.
    progress?.phoneCopyTimestamps?.forEach((item) => {
      phoneCopyMap[item.leadIndex] = item.copiedAt;
    });

    // Database dates are UTC.
    // Display in Pakistan Standard Time.
    const formatTimestamp = (value) => {
      if (!value) return "";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) return "";

      const formatted = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Karachi",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).format(date);

      return `${formatted} PKT`;
    };

    sheet.leads = sheet.leads.map((lead, index) => {
      const completed = completedMap[index];
      const copiedAt = phoneCopyMap[index];

      return {
        ...lead,
        rawData: {
          ...lead.rawData,

          REMARKS:
            completed?.remark ||
            lead.rawData?.REMARKS ||
            "",

          "PHONE COPIED AT": formatTimestamp(copiedAt),

          "REMARK SAVED AT": formatTimestamp(
            completed?.submittedAt
          ),

          "AGENT NOTE": completed?.note || "",

          "UPDATED AT": completed?.submittedAt
            ? new Date(completed.submittedAt).toLocaleString()
            : "",
        },
      };
    });

    // Keep original CSV headers and place the two
    // new columns immediately after REMARKS.
    const headers = [...(sheet.headers || [])];

    if (!headers.includes("REMARKS")) {
      headers.push("REMARKS");
    }

    const placeAfter = (column, previousColumn) => {
      const previousPosition = headers.indexOf(column);

      if (previousPosition !== -1) {
        headers.splice(previousPosition, 1);
      }

      const insertPosition = headers.indexOf(previousColumn) + 1;
      headers.splice(insertPosition, 0, column);
    };

    placeAfter("PHONE COPIED AT", "REMARKS");
    placeAfter("REMARK SAVED AT", "PHONE COPIED AT");

    if (!headers.includes("AGENT NOTE")) {
      headers.push("AGENT NOTE");
    }

    if (!headers.includes("UPDATED AT")) {
      headers.push("UPDATED AT");
    }

    sheet.headers = headers;

    return res.json(sheet);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};


export const pinCurrentLead = async (req, res) => {
  try {
    const { sheetId } = req.params;
    const { reason, note } = req.body;

    const progress = await LeadProgress.findOne({
      agent: req.user._id,
      leadSheet: sheetId,
    });

    if (!progress) {
      return res.status(404).json({ message: "Progress not found" });
    }

    const alreadyPinned = progress.pinnedLeads.some(
      (item) => item.leadIndex === progress.currentIndex
    );

    if (!alreadyPinned) {
      progress.pinnedLeads.push({
        leadIndex: progress.currentIndex,
        reason: reason || "Follow up later",
        note,
        pinnedAt: new Date(),
      });

      await progress.save();
    }

    res.json({ message: "Lead pinned successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPinnedLeads = async (req, res) => {
  try {
    const { sheetId } = req.params;

    const sheet = await LeadSheet.findById(sheetId).lean();

    const progress = await LeadProgress.findOne({
      agent: req.user._id,
      leadSheet: sheetId,
    }).lean();

    const pinned = progress?.pinnedLeads || [];

    const leads = pinned.map((pin) => ({
      ...pin,
      lead: sheet.leads[pin.leadIndex],
    }));

    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removePinnedLead = async (req, res) => {
  try {
    const { sheetId, leadIndex } = req.params;

    const progress = await LeadProgress.findOne({
      agent: req.user._id,
      leadSheet: sheetId,
    });

    progress.pinnedLeads = progress.pinnedLeads.filter(
      (item) => item.leadIndex !== Number(leadIndex)
    );

    await progress.save();

    res.json({ message: "Pinned lead removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLeadByIndex = async (req, res) => {
  try {
    const { sheetId, leadIndex } = req.params;

    const sheet = await LeadSheet.findById(sheetId);
    const progress = await LeadProgress.findOne({
      agent: req.user._id,
      leadSheet: sheetId,
    });

    const index = Number(leadIndex);
    const lead = sheet.leads[index];

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const completedLead = progress?.completedLeads?.find(
      (item) => item.leadIndex === index
    );

    res.json({
      currentIndex: index,
      totalLeads: sheet.leads.length,
      lead,
      isPinnedView: true,
      savedRemark: completedLead?.remark || "",
      savedNote: completedLead?.note || "",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const downloadCompletedLeadsCSV = async (req, res) => {
  try {
    const { sheetId } = req.params;

    const sheet = await LeadSheet.findById(sheetId).lean();

    if (!sheet) {
      return res.status(404).json({ message: "Sheet not found" });
    }

    const progress = await LeadProgress.findOne({
      agent: req.user._id,
      leadSheet: sheetId,
    }).lean();

    if (!progress) {
      return res.status(404).json({ message: "Progress not found" });
    }

    const completedRows = sheet.leads.slice(0, progress.currentIndex);

    const completedMap = {};

    progress.completedLeads?.forEach((item) => {
      completedMap[item.leadIndex] = item;
    });

    const headers = [
      ...(sheet.headers || []),
      "AGENT REMARK",
      "AGENT NOTE",
      "SUBMITTED AT",
    ];

    const escapeCSV = (value) => {
      if (value === null || value === undefined) return "";
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [];

    csvRows.push(headers.map(escapeCSV).join(","));

    completedRows.forEach((lead, index) => {
      const completed = completedMap[index];

      const row = headers.map((header) => {
        if (header === "AGENT REMARK") return escapeCSV(completed?.remark || "");
        if (header === "AGENT NOTE") return escapeCSV(completed?.note || "");
        if (header === "SUBMITTED AT") {
          return escapeCSV(
            completed?.submittedAt
              ? new Date(completed.submittedAt).toLocaleString()
              : ""
          );
        }

        return escapeCSV(lead.rawData?.[header] || "");
      });

      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${sheet.sheetName}-completed-leads.csv"`
    );

    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getAgentLeadReport = async (req, res) => {
  try {
    const { sheetId } = req.query;

    const filter = {
      agent: req.user._id,
    };

    if (sheetId) {
      filter.leadSheet = sheetId;
    }

    const progressList = await LeadProgress.find(filter)
      .populate("leadSheet", "sheetName totalLeads leads")
      .sort({ updatedAt: -1 })
      .lean();

    const reports = progressList.map((progress) => {
      const totalLeads =
        progress.leadSheet?.totalLeads ||
        progress.leadSheet?.leads?.length ||
        0;

      const completed = progress.completedLeads?.length || 0;

      const remarkStats = {};
      const dateStats = {};

      progress.completedLeads?.forEach((item) => {
        remarkStats[item.remark] = (remarkStats[item.remark] || 0) + 1;

        const date = item.submittedAt
          ? new Date(item.submittedAt).toISOString().split("T")[0]
          : "Unknown";

        dateStats[date] = (dateStats[date] || 0) + 1;
      });

      return {
        sheetId: progress.leadSheet?._id,
        sheetName: progress.leadSheet?.sheetName,
        totalLeads,
        completed,
        remaining: totalLeads - completed,
        currentRow: progress.currentIndex + 1,
        progressPercent: totalLeads
          ? Math.round((completed / totalLeads) * 100)
          : 0,
        remarkStats: Object.entries(remarkStats).map(([name, value]) => ({
          name,
          value,
        })),
        dateStats: Object.entries(dateStats).map(([date, count]) => ({
          date,
          count,
        })),
        recentActivity: progress.completedLeads
          ?.slice(-10)
          .reverse()
          .map((item) => ({
            row: item.leadIndex + 1,
            remark: item.remark,
            note: item.note,
            submittedAt: item.submittedAt,
          })),
      };
    });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

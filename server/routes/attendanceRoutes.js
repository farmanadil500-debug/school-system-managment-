import express from "express";
import Attendance from "../models/Attendance.js";

const router = express.Router();

// 1. GET ATTENDANCE SHEET FOR A SPECIFIC DATE, CLASS, SECTION
// GET /api/attendance?date=2026-11-09&class=Grade 6&section=A
router.get("/", async (req, res) => {
  try {
    const { date, class: className, section } = req.query;

    if (date && className && section) {
      const sheet = await Attendance.findOne({
        date,
        class: className,
        section,
      });
      return res.json(sheet || null);
    }

    // If query by date only (for dashboard / overview)
    const filter = {};
    if (date) filter.date = date;
    if (className) filter.class = className;

    const sheets = await Attendance.find(filter).sort({ date: -1 });
    res.json(sheets);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ message: "Error fetching attendance", error: error.message });
  }
});

// 2. SAVE OR UPDATE ATTENDANCE SHEET (Upsert)
// POST /api/attendance
router.post("/", async (req, res) => {
  try {
    const { date, class: className, section, records } = req.body;

    if (!date || !className || !section || !Array.isArray(records)) {
      return res.status(400).json({ message: "Date, class, section, and records array are required." });
    }

    // Calculate totals
    const totalPresent = records.filter((r) => r.status === "Present").length;
    const totalAbsent = records.filter((r) => r.status === "Absent").length;
    const totalLate = records.filter((r) => r.status === "Late").length;

    // Upsert: find existing sheet for this date + class + section or create new
    const updatedSheet = await Attendance.findOneAndUpdate(
      { date, class: className, section },
      {
        date,
        class: className,
        section,
        records,
        totalPresent,
        totalAbsent,
        totalLate,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(updatedSheet);
  } catch (error) {
    console.error("Error saving attendance:", error);
    res.status(400).json({ message: "Error saving attendance", error: error.message });
  }
});

export default router;

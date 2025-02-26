const express = require("express");
const router = express.Router();
const Report = require("../models/report");

// POST route to receive alerts from IoT device
router.post("/reports", async (req, res) => {
  try {
    // Extract data from the request body
    const { type, location } = req.body;

    // Validate that required fields are present
    if (!type || !location || !location.lat || !location.lng) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create a new report document
    const newReport = new Report({
      type,
      location,
    });

    // Save to MongoDB
    await newReport.save();

    // Respond with success message
    res
      .status(201)
      .json({ message: "Report saved successfully", report: newReport });
  } catch (error) {
    console.error("Error saving report:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET route to fetch all reports (for the frontend reports page)
router.get("/reports", async (req, res) => {
  try {
    const reports = await Report.find().sort({ timestamp: -1 }); // Fetch reports, newest first
    res.json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;

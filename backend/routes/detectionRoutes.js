// routes/detectionRoutes.js
const express = require("express");
const Detection = require("../models/Detection"); // Import model
const { GridFSBucket } = require("mongodb");
const mongoose = require("mongoose");

const router = express.Router();

// GET - Fetch all detections (non-archived by default)
router.get("/", async (req, res) => {
  try {
    const { includeArchived = "false" } = req.query;
    const query =
      includeArchived === "true" ? {} : { isArchived: { $ne: true } };
    const detections = await Detection.find(query).sort({ timestamp: -1 });
    res.json(detections);
  } catch (error) {
    console.error("❌ Error fetching detections:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST - Save detection data
router.post("/", async (req, res) => {
  try {
    const { detection } = req.body;
    if (!detection) {
      return res.status(400).json({ error: "Detection data is required" });
    }

    const newDetection = new Detection({ detection });
    await newDetection.save();

    console.log("✅ Detection saved:", newDetection); // Debugging log

    res
      .status(201)
      .json({ message: "Detection stored in MongoDB", status: "success" });
  } catch (error) {
    console.error("❌ Error storing detection:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH - Archive a detection (instead of delete)
router.patch("/:id/archive", async (req, res) => {
  try {
    const { id } = req.params;
    const { archivedBy } = req.body;

    const archivedDetection = await Detection.findByIdAndUpdate(
      id,
      {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: archivedBy || "System",
      },
      { new: true }
    );

    if (!archivedDetection) {
      return res.status(404).json({ error: "Detection not found" });
    }

    console.log("✅ Detection archived:", archivedDetection);
    res.json({ message: "Detection archived successfully" });
  } catch (error) {
    console.error("❌ Error archiving detection:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH - Restore an archived detection
router.patch("/:id/restore", async (req, res) => {
  try {
    const { id } = req.params;

    const restoredDetection = await Detection.findByIdAndUpdate(
      id,
      {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
      },
      { new: true }
    );

    if (!restoredDetection) {
      return res.status(404).json({ error: "Detection not found" });
    }

    console.log("✅ Detection restored:", restoredDetection);
    res.json({ message: "Detection restored successfully" });
  } catch (error) {
    console.error("❌ Error restoring detection:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE - Delete a detection (keep for admin purposes, but use archive instead)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedDetection = await Detection.findByIdAndDelete(id);

    if (!deletedDetection) {
      return res.status(404).json({ error: "Detection not found" });
    }

    console.log("✅ Detection deleted:", deletedDetection);
    res.json({ message: "Detection deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting detection:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

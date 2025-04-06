// routes/detectionRoutes.js
const express = require("express");
const Detection = require("../models/Detection"); // Import model
const { GridFSBucket } = require("mongodb");
const mongoose = require("mongoose");

const router = express.Router();

// GET - Fetch all detections
router.get("/", async (req, res) => {
  try {
    const detections = await Detection.find().sort({ timestamp: -1 });
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

    res.status(201).json({ message: "Detection stored in MongoDB", status: "success" });
  } catch (error) {
    console.error("❌ Error storing detection:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE - Delete a detection
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

// GET - Retrieve audio file for a specific detection
router.get("/audio/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const detection = await Detection.findById(id);
    
    if (!detection || !detection.file_id) {
      return res.status(404).json({ error: "Audio file not found" });
    }

    const bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'fs'
    });

    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(detection.file_id));
    
    res.setHeader('Content-Type', 'audio/wav');
    downloadStream.pipe(res);

    downloadStream.on('error', (error) => {
      console.error("Error streaming audio file:", error);
      res.status(500).json({ error: "Error streaming audio file" });
    });
  } catch (error) {
    console.error("Error retrieving audio file:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
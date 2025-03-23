const express = require("express");
const Detection = require("../models/Detection"); // Import model
const mongoose = require("mongoose");

const router = express.Router();

module.exports = (io) => {
  // GET - Fetch all detections
  router.get("/", async (req, res) => {
    try {
      console.log("📥 Fetching detections from database...");
      
      const dbState = mongoose.connection.readyState;
      console.log("🔌 MongoDB connection state:", dbState);
      
      const detections = await Detection.find().sort({ timestamp: -1 });
      console.log(`✅ Found ${detections.length} detections`);
      
      res.json(detections.map(d => ({ ...d.toObject(), timestamp: d.timestamp.toISOString() })));
    } catch (error) {
      console.error("❌ Error fetching detections:", error);
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });

  // POST - Save detection and emit event
  router.post("/", async (req, res) => {
    try {
      const { detection } = req.body;
      console.log("📝 Received detection data:", req.body);

      if (!detection) {
        return res.status(400).json({ error: "Detection data is required" });
      }

      const newDetection = new Detection({ detection, timestamp: new Date() });
      await newDetection.save();

      console.log("✅ Detection saved successfully:", newDetection);

      // Emit real-time event to connected clients
      io.emit("chainsawDetected", { 
        ...newDetection.toObject(), 
        timestamp: newDetection.timestamp.toISOString() 
      });

      res.status(201).json({ 
        message: "Detection stored and emitted", 
        status: "success",
        detection: newDetection
      });
    } catch (error) {
      console.error("❌ Error storing detection:", error);
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });

  return router;
};